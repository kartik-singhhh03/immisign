#!/usr/bin/env node
/** Probe agent signature migrations on production Supabase. */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient, loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const MIGRATION_DELETE_SYNC = '20260608100000_agent_signature_sync_on_delete.sql';
const MIGRATION_NATIVE = '20260623100000_native_agreement_signing.sql';
const USER_COLUMNS = ['signature_storage_path', 'signature_uploaded_at'];

function loadEnv() {
  return loadEnvFromFiles();
}

async function probeColumn(admin, table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  return { column, exists: !error, error: error?.message || null };
}

async function probeTriggerViaPg() {
  try {
    const client = await connectPgClient();
    const fn = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'clear_user_default_signature_path'
      ) AS fn_exists
    `);
    const tr = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'clear_user_default_signature_path'
      ) AS trigger_exists
    `);
    const syncFn = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'sync_user_default_signature_path'
      ) AS fn_exists
    `);
    await client.end();
    return {
      method: 'postgres',
      clearFunctionExists: Boolean(fn.rows[0]?.fn_exists),
      deleteTriggerExists: Boolean(tr.rows[0]?.trigger_exists),
      syncFunctionExists: Boolean(syncFn.rows[0]?.fn_exists),
    };
  } catch (e) {
    return {
      method: 'postgres_unavailable',
      error: e.message,
      clearFunctionExists: null,
      deleteTriggerExists: null,
      syncFunctionExists: null,
    };
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('MISSING_SUPABASE_ENV');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const userResults = [];
  for (const col of USER_COLUMNS) {
    userResults.push(await probeColumn(admin, 'users', col));
  }

  const triggerProbe = await probeTriggerViaPg();
  const userColumnsOk = userResults.every((r) => r.exists);
  const deleteSyncApplied =
    triggerProbe.deleteTriggerExists === true && triggerProbe.clearFunctionExists === true;
  const syncApplied = triggerProbe.syncFunctionExists === true;

  const report = {
    timestamp: new Date().toISOString(),
    supabaseUrl: url.replace(/https:\/\/([^.]+).*/, 'https://$1.supabase.co'),
    migrations: {
      [MIGRATION_NATIVE]: {
        label: 'users.signature_storage_path + sync trigger',
        userColumns: userResults,
        userColumnsOk,
        syncFunctionExists: triggerProbe.syncFunctionExists,
        applied: userColumnsOk && syncApplied,
      },
      [MIGRATION_DELETE_SYNC]: {
        label: 'clear_user_default_signature_path trigger on delete',
        clearFunctionExists: triggerProbe.clearFunctionExists,
        deleteTriggerExists: triggerProbe.deleteTriggerExists,
        applied: deleteSyncApplied,
      },
    },
    triggerProbe,
    allApplied: userColumnsOk && syncApplied && deleteSyncApplied,
    verdict: userColumnsOk && syncApplied && deleteSyncApplied ? 'PASS' : 'NOT PASS',
  };

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/AGENT_SIGNATURE_MIGRATION_PROBE.json', JSON.stringify(report, null, 2));

  const md = `# Agent Signature Migration Report

Generated: ${report.timestamp}

## Verdict: **${report.verdict}**

| Migration | Status | Notes |
|-----------|--------|-------|
| \`${MIGRATION_NATIVE}\` | ${report.migrations[MIGRATION_NATIVE].applied ? 'APPLIED' : 'NOT APPLIED'} | User columns + sync trigger |
| \`${MIGRATION_DELETE_SYNC}\` | ${report.migrations[MIGRATION_DELETE_SYNC].applied ? 'APPLIED' : 'NOT APPLIED'} | Delete sync trigger |

## User columns (\`users\`)

| Column | Exists |
|--------|--------|
${userResults.map((r) => `| \`${r.column}\` | ${r.exists ? 'YES' : 'NO'} |`).join('\n')}

## Trigger probe (${triggerProbe.method})

| Check | Result |
|-------|--------|
| \`sync_user_default_signature_path\` function | ${triggerProbe.syncFunctionExists === null ? 'unknown' : triggerProbe.syncFunctionExists ? 'YES' : 'NO'} |
| \`clear_user_default_signature_path\` function | ${triggerProbe.clearFunctionExists === null ? 'unknown' : triggerProbe.clearFunctionExists ? 'YES' : 'NO'} |
| \`clear_user_default_signature_path\` trigger | ${triggerProbe.deleteTriggerExists === null ? 'unknown' : triggerProbe.deleteTriggerExists ? 'YES' : 'NO'} |

${triggerProbe.error ? `\n**Postgres probe note:** ${triggerProbe.error}\n` : ''}

## Action required

${report.allApplied ? 'No migration action required.' : 'Apply pending migration(s) via `node scripts/apply-agent-signature-migration.mjs` or Supabase SQL editor.'}
`;

  fs.writeFileSync('docs/AGENT_SIGNATURE_MIGRATION_REPORT.md', md);
  console.log(JSON.stringify(report, null, 2));
  console.log('\nWrote docs/AGENT_SIGNATURE_MIGRATION_REPORT.md');
  process.exit(report.allApplied ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

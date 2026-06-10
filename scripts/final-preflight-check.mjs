/**
 * MIG-1 / E2E-3 preflight: schema + environment + integration readiness
 * Usage: node scripts/final-preflight-check.mjs
 */
import fs from 'node:fs';
import { connectPgClient, loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const CRITICAL_TABLES = [
  'clients', 'agreements', 'agreement_fee_items', 'application_approvals',
  'service_statements', 'file_notes', 'notifications', 'activity_events',
  'webhook_events', 'document_audit_events', 'email_delivery_audit',
  'matter_applicants', 'matter_financials', 'integration_health_logs',
];

const REQUIRED_COLUMNS = {
  notifications: ['priority', 'scope', 'deleted_at', 'metadata'],
  user_notification_preferences: ['email_digest_frequency', 'last_digest_sent_at'],
};

const RLS_TABLES = [
  'clients', 'agreements', 'application_approvals', 'notifications', 'file_notes',
  'service_statements', 'document_audit_events', 'activity_events', 'email_delivery_audit',
  'webhook_events', 'integration_health_logs',
];

const ENV_REQUIRED = [
  'NEXT_PUBLIC_APP_URL',
  'SIGNWELL_API_KEY',
  'SIGNWELL_WEBHOOK_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
];

const ENV_OPTIONAL = ['SIGNWELL_WEBHOOK_SECRET', 'DATABASE_URL', 'SUPABASE_DB_PASSWORD'];

function checkEnv() {
  const env = loadEnvFromFiles();
  const blockers = [];
  const warnings = [];

  for (const key of ENV_REQUIRED) {
    const v = env[key]?.trim();
    if (!v) blockers.push(`ENV missing: ${key}`);
    else if (v.includes('your_') || v === 'test_wh_sec_your_secret') blockers.push(`ENV placeholder: ${key}`);
  }

  for (const key of ENV_OPTIONAL) {
    const v = env[key]?.trim();
    if (!v) warnings.push(`ENV optional missing: ${key}`);
    else if (key === 'SIGNWELL_WEBHOOK_SECRET' && (v.includes('your_') || v === 'test_wh_sec_your_secret')) {
      warnings.push('SIGNWELL_WEBHOOK_SECRET is placeholder (SKIP_WEBHOOK_VALIDATION may be set)');
    }
  }

  if (!env.DATABASE_URL?.trim() && !env.SUPABASE_DB_PASSWORD?.trim()) {
    warnings.push('No DATABASE_URL or SUPABASE_DB_PASSWORD — db push scripts use pooler resolver');
  }

  return { blockers, warnings, env };
}

async function checkSchema(client) {
  const blockers = [];

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableSet = new Set(tables.map((t) => t.table_name));

  for (const t of CRITICAL_TABLES) {
    if (!tableSet.has(t)) blockers.push(`Schema: missing table ${t}`);
  }

  const { rows: columns } = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const colMap = {};
  for (const c of columns) {
    if (!colMap[c.table_name]) colMap[c.table_name] = [];
    colMap[c.table_name].push(c.column_name);
  }

  for (const [tbl, cols] of Object.entries(REQUIRED_COLUMNS)) {
    for (const col of cols) {
      if (!colMap[tbl]?.includes(col)) blockers.push(`Schema: missing column ${tbl}.${col}`);
    }
  }

  const { rows: rls } = await client.query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `);
  const rlsMap = Object.fromEntries(rls.map((r) => [r.table_name, r.rls_enabled]));

  const { rows: policies } = await client.query(`
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  `);
  const policyMap = {};
  for (const p of policies) {
    if (!policyMap[p.tablename]) policyMap[p.tablename] = [];
    policyMap[p.tablename].push(p.policyname);
  }

  for (const t of RLS_TABLES) {
    if (!tableSet.has(t)) continue;
    if (!rlsMap[t]) blockers.push(`RLS: ${t} not enabled`);
    if (!policyMap[t]?.length) blockers.push(`RLS: ${t} has no policies`);
  }

  const { rows: rpc } = await client.query(`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'create_notification'
  `);
  if (!rpc.length) blockers.push('Schema: missing RPC create_notification');

  return { blockers, tableCount: tableSet.size };
}

async function main() {
  const result = {
    timestamp: new Date().toISOString(),
    sections: {},
    blockers: [],
    warnings: [],
    verdict: 'PASS',
  };

  const { blockers: envBlockers, warnings } = checkEnv();
  result.sections.environment = { status: envBlockers.length ? 'FAIL' : 'PASS', blockers: envBlockers };
  result.blockers.push(...envBlockers);
  result.warnings.push(...warnings);

  let client;
  try {
    client = await connectPgClient();
    const { blockers: schemaBlockers, tableCount } = await checkSchema(client);
    result.sections.database = { status: schemaBlockers.length ? 'FAIL' : 'PASS', tableCount, blockers: schemaBlockers };
    result.sections.notifications = {
      status: schemaBlockers.some((b) => b.includes('notifications')) ? 'FAIL' : 'PASS',
    };
    result.sections.webhooks = {
      status: schemaBlockers.some((b) => b.includes('webhook')) ? 'FAIL' : 'PASS',
    };
    result.sections.audit = {
      status: schemaBlockers.some((b) => b.includes('audit') || b.includes('activity_events')) ? 'FAIL' : 'PASS',
    };
    result.blockers.push(...schemaBlockers);
    await client.end();
  } catch (e) {
    result.sections.database = { status: 'FAIL', error: e.message };
    result.blockers.push(`Database connection failed: ${e.message}`);
  }

  result.verdict = result.blockers.length ? 'FAIL' : 'PASS';

  fs.mkdirSync('docs/e2e-evidence', { recursive: true });
  fs.writeFileSync('docs/e2e-evidence/final-preflight.json', JSON.stringify(result, null, 2));

  console.log(`\n=== FINAL PREFLIGHT: ${result.verdict} ===\n`);
  if (result.blockers.length) {
    console.log('Blockers:');
    result.blockers.forEach((b) => console.log(`  - ${b}`));
  }
  if (result.warnings.length) {
    console.log('\nWarnings:');
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (!result.blockers.length) console.log('All checks passed. Ready for E2E-3.');

  process.exit(result.blockers.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/** Probe native agreement signing migration columns on Supabase. */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const MIGRATION = '20260623100000_native_agreement_signing.sql';

const AGREEMENT_COLUMNS = [
  'signing_provider',
  'signing_token',
  'token_expires_at',
  'signed_pdf_storage_path',
  'signing_record_storage_path',
  'client_signature_storage_path',
  'downloaded_at',
  'client_ip',
  'client_user_agent',
  'client_name_confirmed',
  'pdf_hash',
  'signed_pdf_hash',
  'signature_hash',
  'audit_hash',
  'signing_record_hash',
];

const USER_COLUMNS = ['signature_storage_path', 'signature_uploaded_at'];

function loadEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[line.slice(0, i).trim()] = v;
    }
  }
  return env;
}

async function probeColumn(admin, table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  return { column, exists: !error, error: error?.message || null };
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
  const agreementResults = [];
  for (const col of AGREEMENT_COLUMNS) {
    agreementResults.push(await probeColumn(admin, 'agreements', col));
  }
  const userResults = [];
  for (const col of USER_COLUMNS) {
    userResults.push(await probeColumn(admin, 'users', col));
  }

  const allAgreement = agreementResults.every((r) => r.exists);
  const allUsers = userResults.every((r) => r.exists);
  const allApplied = allAgreement && allUsers;

  const report = {
    migration: MIGRATION,
    timestamp: new Date().toISOString(),
    allApplied,
    agreements: agreementResults,
    users: userResults,
    missing: [
      ...agreementResults.filter((r) => !r.exists).map((r) => `agreements.${r.column}`),
      ...userResults.filter((r) => !r.exists).map((r) => `users.${r.column}`),
    ],
  };

  const outPath = 'docs/NATIVE_SIGNING_MIGRATION_PROBE.json';
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Migration probe: ${allApplied ? 'PASS' : 'FAIL'}`);
  if (report.missing.length) {
    console.log('Missing:', report.missing.join(', '));
  }
  console.log('Report:', outPath);
  process.exit(allApplied ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

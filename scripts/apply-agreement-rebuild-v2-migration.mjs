#!/usr/bin/env node
/**
 * Apply agreement rebuild v2 migration effects when Supabase CLI / db push unavailable.
 * Idempotent — safe to re-run.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const SQL = fs.readFileSync(
  'supabase/migrations/20260622100000_agreement_rebuild_v2.sql',
  'utf8',
);

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

async function alreadyApplied(admin) {
  const { data } = await admin.from('matter_types').select('name').eq('name', 'Visa Application').limit(1);
  return (data?.length ?? 0) > 0;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (await alreadyApplied(admin)) {
    console.log('PASS: agreement rebuild v2 already applied (Visa Application matter type exists)');
    return;
  }

  console.log('Applying 20260622100000_agreement_rebuild_v2.sql via Postgres...');
  const pg = await connectPgClient();
  try {
    await pg.query(SQL);
    console.log('PASS: agreement rebuild v2 migration applied');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});

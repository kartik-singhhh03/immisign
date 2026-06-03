/**
 * Apply Phase 7 SQL via Postgres when DATABASE_URL or SUPABASE_DB_PASSWORD is configured.
 * Falls back to verifying RPC exists via Supabase service role.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
  }
  return env;
}

function resolveDatabaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const password = env.SUPABASE_DB_PASSWORD || env.POSTGRES_PASSWORD;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!password || !match) return null;
  const ref = match[1];
  const region = env.SUPABASE_DB_REGION || 'ap-southeast-2';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

const env = loadEnv();
const databaseUrl = resolveDatabaseUrl(env);
const migrationFile = '20260603140000_phase7_audit.sql';
const sqlPath = path.join('supabase', 'migrations', migrationFile);

async function verifyRpc() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: agencies } = await supabase.from('agencies').select('id, slug').limit(1);
  if (!agencies?.[0]) {
    console.log('RPC_CHECK_SKIP', 'no agencies');
    return false;
  }
  const { data, error } = await supabase.rpc('allocate_agreement_reference', {
    p_agency_id: agencies[0].id,
    p_prefix: 'TST',
  });
  console.log('RPC_CHECK', { ok: !error, ref: data, error: error?.message });
  return !error;
}

if (databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  const { rows } = await client.query('SELECT 1 FROM public.schema_migrations WHERE filename = $1', [migrationFile]);
  if (rows.length) {
    console.log('SKIP', migrationFile, '(already applied)');
  } else {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('APPLY', migrationFile);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [migrationFile]);
      await client.query('COMMIT');
      console.log('OK', migrationFile);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('FAILED', err.message);
      process.exit(1);
    }
  }
  await client.end();
} else {
  console.warn('NO_DATABASE_URL — skipping DDL apply; checking RPC only');
}

const rpcOk = await verifyRpc();
if (!rpcOk) {
  console.error('allocate_agreement_reference RPC not available — apply migration manually in Supabase SQL editor');
  process.exit(1);
}
console.log('PHASE7_MIGRATION_OK');

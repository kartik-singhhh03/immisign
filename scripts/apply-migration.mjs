import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const migrationFile = process.argv[2] || 'supabase/migrations/20260610130000_file_notes_compliance.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');
const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref || !env.SUPABASE_DB_PASSWORD) {
  console.error('Missing SUPABASE ref or SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const region = env.SUPABASE_DB_REGION || 'ap-southeast-2';
const urls = [
  env.DATABASE_URL,
  `postgresql://postgres.${ref}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
].filter(Boolean);

const { default: pg } = await import('pg');
let applied = false;
for (const dbUrl of urls) {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'application_approvals' AND column_name = 'signed_document_path'
    `);
    console.log('MIGRATION_APPLIED', '20260610120000_approval_signed_document.sql');
    console.log('COLUMN_CHECK', rows.length ? 'signed_document_path OK' : 'MISSING');
    applied = true;
    await client.end();
    break;
  } catch (e) {
    console.warn('DB_CONNECT_FAIL', dbUrl?.replace(/:[^:@]+@/, ':***@'), e.message);
    try { await client.end(); } catch { /* ignore */ }
  }
}
if (!applied) process.exit(1);

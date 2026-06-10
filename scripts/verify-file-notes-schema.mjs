import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const { default: pg } = await import('pg');
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const c = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const tables = await c.query(`SELECT to_regclass('public.file_notes') as tbl`);
console.log('file_notes_table', tables.rows[0]?.tbl || 'MISSING');
if (tables.rows[0]?.tbl) {
  const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='file_notes'`);
  console.log('columns', cols.rows.map((r) => r.column_name).join(', '));
}
const cn = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name='client_number'`);
console.log('client_number_column', cn.rows.length ? 'OK' : 'MISSING');
await c.end();

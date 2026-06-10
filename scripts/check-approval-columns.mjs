import fs from 'node:fs';
const { default: pg } = await import('pg');
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const c = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='application_approvals' AND column_name IN ('client_sent_at','signwell_document_id','client_signed_at','certificate_storage_path')`);
console.log('columns', cols.rows);
await c.end();

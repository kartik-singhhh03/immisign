import fs from 'node:fs';
import pg from 'pg';

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

const env = loadEnv();
const connectionString =
  env.DATABASE_URL ||
  env.SUPABASE_DB_URL ||
  env.POSTGRES_URL;

if (!connectionString) {
  console.error('No DATABASE_URL / SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

const sql = fs.readFileSync(
  'supabase/migrations/20260611150000_file_notes_file_scoped.sql',
  'utf8',
);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log('Migration applied: 20260611150000_file_notes_file_scoped.sql');
} finally {
  await client.end();
}

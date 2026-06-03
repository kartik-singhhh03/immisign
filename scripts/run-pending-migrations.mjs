import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

function loadEnv() {
  const env = {};
  const file = '.env.local';
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return env;
}

function resolveDatabaseUrl(env) {
  const candidates = resolveDatabaseUrlCandidates(env);
  return candidates[0] || null;
}

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);
  if (!databaseUrl) {
    console.error('MISSING_DATABASE_URL');
    console.error('Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local to apply migrations.');
    process.exit(1);
  }

  const migrationsDir = path.join('supabase', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const { rows: applied } = await client.query('SELECT filename FROM public.schema_migrations');
  const appliedSet = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log('SKIP', file);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log('APPLY', file);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('OK', file);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('FAILED', file, err.message);
      process.exit(1);
    }
  }

  await client.end();
  console.log('MIGRATIONS_COMPLETE');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Phase 11.3 — Apply pending migrations + schema repair, then verify.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { connectPgClient, loadEnvFromFiles } from './lib/resolve-database-url.mjs';

async function ensureSchemaMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

async function applySqlFile(client, filePath, recordName) {
  const name = recordName || path.basename(filePath);
  const { rows } = await client.query('SELECT 1 FROM public.schema_migrations WHERE filename = $1', [name]);
  if (rows.length) {
    console.log('SKIP', name);
    return { skipped: true };
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('APPLY', name);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log('OK', name);
    return { skipped: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  if (!loadEnvFromFiles().SUPABASE_DB_PASSWORD && !loadEnvFromFiles().DATABASE_URL) {
    console.error('MISSING_DATABASE_CREDENTIALS — set SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local');
    process.exit(1);
  }

  const repair = spawnSync(process.execPath, ['scripts/phase11-3-apply-repair-only.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  process.exit(repair.status === 0 ? 0 : repair.status || 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

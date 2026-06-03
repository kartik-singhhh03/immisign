#!/usr/bin/env node
/**
 * Apply only idempotent repair + migrations not yet recorded (skips base schema re-apply).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { connectPgClient } from './lib/resolve-database-url.mjs';

async function ensureSchemaMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

async function isRecorded(client, name) {
  const { rows } = await client.query('SELECT 1 FROM public.schema_migrations WHERE filename = $1', [name]);
  return rows.length > 0;
}

async function applySqlFile(client, filePath) {
  const name = path.basename(filePath);
  if (await isRecorded(client, name)) {
    console.log('SKIP', name);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('APPLY', name);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    await client.query('COMMIT');
    console.log('OK', name);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/** Mark migrations as applied without running SQL (DB already provisioned via dashboard). */
async function bootstrapAppliedMigrations(client, allFiles) {
  const { rows } = await client.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencies') AS ok`,
  );
  if (!rows[0]?.ok) return false;

  console.log('BOOTSTRAP schema_migrations for existing database');
  for (const file of allFiles) {
    if (file === '20260603180000_phase11_2_schema_repair.sql') continue;
    await client.query(
      'INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
      [file],
    );
  }
  return true;
}

async function main() {
  const client = await connectPgClient();
  await ensureSchemaMigrations(client);

  const migrationsDir = path.join('supabase', 'migrations');
  const allFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS n FROM public.schema_migrations');
  if (countRows[0]?.n === 0) {
    await bootstrapAppliedMigrations(client, allFiles);
  }

  const priority = [
    '20260603100000_immisign_single_plan_billing.sql',
    '20260603150000_auto_agent_signatures.sql',
    '20260603170000_phase11_1_hardening.sql',
    '20260603170000_phase85_settings_parity.sql',
    '20260603180000_phase11_2_schema_repair.sql',
  ];

  for (const file of priority) {
    const full = path.join(migrationsDir, file);
    if (!fs.existsSync(full)) continue;
    try {
      await applySqlFile(client, full);
    } catch (err) {
      console.error('FAILED', file, err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();

  const verify = spawnSync(process.execPath, ['scripts/phase11-2-migration-verify.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  process.exit(verify.status === 0 ? 0 : verify.status || 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

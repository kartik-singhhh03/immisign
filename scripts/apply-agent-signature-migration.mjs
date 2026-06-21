#!/usr/bin/env node
import fs from 'node:fs';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const MIGRATION = 'supabase/migrations/20260608100000_agent_signature_sync_on_delete.sql';

async function main() {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const client = await connectPgClient();
  try {
    await client.query(sql);
    const fn = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'clear_user_default_signature_path'
      ) AS ok
    `);
    console.log('MIGRATION_APPLIED', MIGRATION);
    console.log('TRIGGER_CHECK', fn.rows[0]?.ok ? 'PASS' : 'FAIL');
    process.exit(fn.rows[0]?.ok ? 0 : 1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('MIGRATION_FAILED', e.message);
  process.exit(1);
});

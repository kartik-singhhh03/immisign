/**
 * Apply MIG-1 reconciliation SQL directly to database.
 */
import fs from 'node:fs';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const sql = fs.readFileSync('supabase/migrations/99999999999999_reconciliation.sql', 'utf8');
fs.copyFileSync('supabase/migrations/99999999999999_reconciliation.sql', 'docs/MANUAL_SQL_TO_RUN.sql');

const client = await connectPgClient();
try {
  await client.query('BEGIN');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await client.query(sql);
  await client.query(
    `INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
    ['99999999999999_reconciliation.sql'],
  );
  await client.query('COMMIT');
  console.log('RECONCILIATION_APPLIED');
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('FAILED', e.message);
  process.exit(1);
} finally {
  await client.end();
}

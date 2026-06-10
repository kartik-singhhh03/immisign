import fs from 'node:fs';
import { connectPgClient, loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const sql = fs.readFileSync('supabase/migrations/20260617100000_ntf1_notifications.sql', 'utf8');

console.log('Attempting NTF-1 migration via Postgres...');
console.log('If this fails, paste the SQL file into Supabase Dashboard → SQL Editor.\n');

try {
  const client = await connectPgClient();
  try {
    await client.query(sql);
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'notifications'
        AND column_name IN ('priority', 'deleted_at', 'metadata', 'workflow_category')
      ORDER BY column_name
    `);
    console.log('NTF1_MIGRATION_OK', rows.map((r) => r.column_name).join(', '));
    const { rows: tables } = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_events'
    `);
    console.log('ACTIVITY_EVENTS', tables.length ? 'OK' : 'MISSING');
  } finally {
    await client.end();
  }
} catch (e) {
  console.error('MIGRATION_FAILED:', e.message);
  console.error('\nManual apply:');
  console.error('1. Open https://supabase.com/dashboard → your project → SQL Editor');
  console.error('2. Paste contents of supabase/migrations/20260617100000_ntf1_notifications.sql');
  console.error('3. Run query');
  const env = loadEnvFromFiles();
  if (env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(`\nProject: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  }
  process.exit(1);
}

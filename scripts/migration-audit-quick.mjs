import fs from 'node:fs';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const pg = await connectPgClient();
const { rows: migrations } = await pg.query(
  'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version',
);
const local = fs
  .readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .map((f) => f.replace('.sql', ''));
const applied = new Set(migrations.map((r) => r.version));
const pending = local.filter((v) => !applied.has(v) && !v.startsWith('999999'));

const checks = [
  ['application_approvals', 'approval_token'],
  ['application_approvals', 'matter_id'],
  ['agreement_signatures', 'webhook_event_id'],
  ['webhook_events', 'payload_hash'],
  ['application_approval_events', 'event_type'],
];

const results = { applied: migrations.length, pending, columns: {} };
for (const [table, col] of checks) {
  const { rows } = await pg.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col],
  );
  results.columns[`${table}.${col}`] = rows.length > 0 ? 'OK' : 'MISSING';
}

const { rows: bucket } = await pg.query(
  `SELECT id, public FROM storage.buckets WHERE id='application-approvals'`,
);
results.storage_bucket = bucket[0] || null;

console.log(JSON.stringify(results, null, 2));
await pg.end();

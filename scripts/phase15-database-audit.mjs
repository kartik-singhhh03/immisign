#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const client = await connectPgClient();
const report = { timestamp: new Date().toISOString(), checks: {} };

const migDir = path.join('supabase', 'migrations');
const localMigs = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const { rows: applied } = await client.query(
  `SELECT filename FROM public.schema_migrations ORDER BY filename`,
);
const appliedSet = new Set(applied.map((r) => r.filename));
const missing = localMigs.filter((f) => !appliedSet.has(f));
report.checks.migrations = {
  local: localMigs.length,
  applied: applied.length,
  missing,
  ok: missing.length === 0,
};

const coreTables = [
  'agencies',
  'users',
  'clients',
  'agreements',
  'documents',
  'application_approvals',
  'notifications',
  'agency_tasks',
  'user_notification_preferences',
  'activity_logs',
  'subscriptions',
];
const tableStatus = {};
for (const t of coreTables) {
  const { rows } = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS ok`,
    [t],
  );
  tableStatus[t] = rows[0].ok;
}
report.checks.tables = tableStatus;

const { rows: rlsOff } = await client.query(`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY($1::text[])
    AND NOT c.relrowsecurity
`, [coreTables]);
report.checks.rls_disabled_on_core = rlsOff.map((r) => r.table_name);

const { rows: orphans } = await client.query(`
  SELECT 'users_without_agency' AS issue, COUNT(*)::int AS n
  FROM public.users WHERE agency_id IS NULL
  UNION ALL
  SELECT 'clients_orphan_agency', COUNT(*)::int
  FROM public.clients c
  LEFT JOIN public.agencies a ON a.id = c.agency_id
  WHERE a.id IS NULL
  UNION ALL
  SELECT 'agreements_orphan_agency', COUNT(*)::int
  FROM public.agreements g
  LEFT JOIN public.agencies a ON a.id = g.agency_id
  WHERE a.id IS NULL
`);
report.checks.orphans = orphans;

const { rows: indexes } = await client.query(`
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = ANY($1::text[])
  ORDER BY tablename, indexname
`, [coreTables]);
report.checks.index_count_by_table = indexes.reduce((acc, r) => {
  acc[r.tablename] = (acc[r.tablename] || 0) + 1;
  return acc;
}, {});

await client.end();

const out = path.join('docs', 'verification-screenshots', 'phase15-database-audit.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.checks, null, 2));

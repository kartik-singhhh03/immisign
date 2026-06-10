import fs from 'node:fs';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const CRITICAL_TABLES = [
  'clients', 'agreements', 'agreement_fee_items', 'application_approvals',
  'service_statements', 'file_notes', 'notifications', 'activity_events',
  'webhook_events', 'document_audit_events', 'email_delivery_audit',
  'matter_applicants', 'matter_financials', 'integration_health_logs',
];

const REQUIRED_COLUMNS = {
  notifications: ['priority', 'scope', 'deleted_at', 'metadata'],
  user_notification_preferences: ['email_digest_frequency', 'last_digest_sent_at'],
};

const client = await connectPgClient();

const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);

const { rows: columns } = await client.query(`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema = 'public' ORDER BY table_name, ordinal_position
`);

const { rows: policies } = await client.query(`
  SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename
`);

const { rows: rls } = await client.query(`
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
`);

const { rows: migrations } = await client.query(
  'SELECT filename, applied_at FROM public.schema_migrations ORDER BY filename',
).catch(() => ({ rows: [] }));

const tableSet = new Set(tables.map((t) => t.table_name));
const colMap = {};
for (const c of columns) {
  if (!colMap[c.table_name]) colMap[c.table_name] = [];
  colMap[c.table_name].push(c.column_name);
}

const rlsMap = Object.fromEntries(rls.map((r) => [r.table_name, r.rls_enabled]));
const policyMap = {};
for (const p of policies) {
  if (!policyMap[p.tablename]) policyMap[p.tablename] = [];
  policyMap[p.tablename].push(p.policyname);
}

const report = {
  timestamp: new Date().toISOString(),
  tableCount: tableSet.size,
  criticalTables: Object.fromEntries(CRITICAL_TABLES.map((t) => [t, tableSet.has(t)])),
  requiredColumns: {},
  rlsIssues: [],
  appliedMigrations: migrations,
};

for (const [tbl, cols] of Object.entries(REQUIRED_COLUMNS)) {
  report.requiredColumns[tbl] = Object.fromEntries(
    cols.map((c) => [c, colMap[tbl]?.includes(c) ?? false]),
  );
}

for (const t of CRITICAL_TABLES) {
  if (!tableSet.has(t)) report.rlsIssues.push(`${t}: table missing`);
  else if (!rlsMap[t]) report.rlsIssues.push(`${t}: RLS disabled`);
  else if (!policyMap[t]?.length) report.rlsIssues.push(`${t}: no policies`);
}

fs.mkdirSync('docs/e2e-evidence', { recursive: true });
fs.writeFileSync('docs/e2e-evidence/mig-1-db-introspect.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await client.end();

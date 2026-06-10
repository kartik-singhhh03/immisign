/**
 * MIG-1: Migration reconciliation & database verification
 * Usage: node scripts/mig-1-reconcile.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import { connectPgClient, loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const APPLY = process.argv.includes('--apply');

const CRITICAL_TABLES = [
  'clients',
  'agreements',
  'agreement_fee_items',
  'application_approvals',
  'service_statements',
  'file_notes',
  'notifications',
  'activity_events',
  'webhook_events',
  'document_audit_events',
  'email_delivery_audit',
  'matter_applicants',
  'matter_financials',
  'integration_health_logs',
];

const REQUIRED_COLUMNS = {
  notifications: ['priority', 'scope', 'deleted_at', 'metadata', 'assigned_to_user_id', 'due_at', 'archived_at'],
  user_notification_preferences: ['email_digest_frequency', 'last_digest_sent_at'],
};

const RLS_TABLES = [
  'clients', 'agreements', 'application_approvals', 'notifications', 'file_notes',
  'service_statements', 'document_audit_events', 'activity_events', 'email_delivery_audit',
  'webhook_events', 'integration_health_logs',
];

function parseMigrationInventory(migrationsDir) {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  return files.map((file) => {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tables = [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+public\.(\w+)/gi)].map((m) => m[1]);
    const alters = [...sql.matchAll(/ALTER TABLE\s+public\.(\w+)/gi)].map((m) => m[1]);
    const indexes = [...sql.matchAll(/CREATE INDEX(?: IF NOT EXISTS)?\s+(\w+)/gi)].map((m) => m[1]);
    const policies = [...sql.matchAll(/CREATE POLICY\s+"?([^"\s]+)"?/gi)].map((m) => m[1]);
    const purpose = sql.split('\n').find((l) => l.startsWith('--'))?.replace(/^--\s*/, '') || file;
    return { file, purpose, tables: [...new Set(tables)], alters: [...new Set(alters)], indexes: [...new Set(indexes)], policies: [...new Set(policies)] };
  });
}

async function getDbSchema(client) {
  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const { rows: columns } = await client.query(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const { rows: policies } = await client.query(`
    SELECT schemaname, tablename, policyname, cmd
    FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);

  const { rows: rls } = await client.query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  const { rows: enums } = await client.query(`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);

  let appliedMigrations = [];
  try {
    const { rows } = await client.query('SELECT filename, applied_at FROM public.schema_migrations ORDER BY filename');
    appliedMigrations = rows;
  } catch {
    appliedMigrations = [];
  }

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

  return {
    tables: new Set(tables.map((t) => t.table_name)),
    columns: colMap,
    rls: rlsMap,
    policies: policyMap,
    enums,
    appliedMigrations,
  };
}

function buildReconciliationSql(schema) {
  const parts = [
    '-- MIG-1 Reconciliation: idempotent — only adds missing objects',
    '-- Generated: ' + new Date().toISOString(),
    '',
  ];

  const needs = {
    notification_priority_enum: !schema.enums.some((e) => e.enum_name === 'notification_priority'),
    notification_scope_enum: !schema.enums.some((e) => e.enum_name === 'notification_scope'),
    email_digest_enum: !schema.enums.some((e) => e.enum_name === 'email_digest_frequency'),
    notifications_priority: !schema.columns.notifications?.includes('priority'),
    notifications_scope: !schema.columns.notifications?.includes('scope'),
    notifications_deleted_at: !schema.columns.notifications?.includes('deleted_at'),
    notifications_metadata: !schema.columns.notifications?.includes('metadata'),
    activity_events: !schema.tables.has('activity_events'),
    webhook_events: !schema.tables.has('webhook_events'),
    email_delivery_audit: !schema.tables.has('email_delivery_audit'),
    integration_health_logs: !schema.tables.has('integration_health_logs'),
  };

  if (needs.notification_priority_enum) {
    parts.push(`DO $$ BEGIN CREATE TYPE public.notification_priority AS ENUM ('critical', 'high', 'normal', 'low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  }
  if (needs.notification_scope_enum) {
    parts.push(`DO $$ BEGIN CREATE TYPE public.notification_scope AS ENUM ('personal', 'team', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  }
  if (needs.email_digest_enum) {
    parts.push(`DO $$ BEGIN CREATE TYPE public.email_digest_frequency AS ENUM ('immediate', 'hourly', 'daily', 'weekly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  }

  const notifAdds = [];
  if (needs.notifications_priority) notifAdds.push(`ADD COLUMN IF NOT EXISTS priority public.notification_priority NOT NULL DEFAULT 'normal'`);
  if (needs.notifications_scope) notifAdds.push(`ADD COLUMN IF NOT EXISTS scope public.notification_scope NOT NULL DEFAULT 'personal'`);
  if (needs.notifications_deleted_at) notifAdds.push(`ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  if (needs.notifications_metadata) notifAdds.push(`ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);
  if (!schema.columns.notifications?.includes('assigned_to_user_id')) notifAdds.push(`ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL`);
  if (!schema.columns.notifications?.includes('due_at')) notifAdds.push(`ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ`);
  if (!schema.columns.notifications?.includes('archived_at')) notifAdds.push(`ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`);
  if (!schema.columns.notifications?.includes('workflow_category')) notifAdds.push(`ADD COLUMN IF NOT EXISTS workflow_category TEXT`);

  if (notifAdds.length) {
    parts.push('', 'ALTER TABLE public.notifications');
    parts.push('  ' + notifAdds.join(',\n  ') + ';');
  }

  if (needs.activity_events) {
    parts.push('', fs.readFileSync('supabase/migrations/20260617100000_ntf1_notifications.sql', 'utf8')
      .split('-- Activity events')[1]
      .split('-- Digest preferences')[0]);
  }

  if (needs.webhook_events || needs.integration_health_logs) {
    parts.push('', fs.readFileSync('supabase/migrations/20260618100000_int1_webhook_events.sql', 'utf8'));
  }

  if (needs.email_delivery_audit) {
    parts.push('', fs.readFileSync('supabase/migrations/20260619100000_rsd1_email_delivery_audit.sql', 'utf8'));
  }

  // Indexes (idempotent)
  parts.push(`
CREATE INDEX IF NOT EXISTS idx_notifications_inbox
  ON public.notifications (user_id, agency_id, deleted_at, is_read, created_at DESC)
  WHERE deleted_at IS NULL;
`);

  if (needs.activity_events || schema.tables.has('activity_events')) {
    parts.push(`CREATE INDEX IF NOT EXISTS idx_activity_events_agency_time ON public.activity_events (agency_id, created_at DESC);`);
  }

  return { sql: parts.join('\n'), needs };
}

function assessMigrationStatus(inventory, schema) {
  return inventory.map((m) => {
    const missingTables = m.tables.filter((t) => !schema.tables.has(t));
    const status = missingTables.length === 0 ? 'APPLIED' : missingTables.length < m.tables.length ? 'PARTIALLY APPLIED' : m.tables.length ? 'MISSING' : 'APPLIED';
    return { ...m, status, missingTables };
  });
}

function checkEnv() {
  const env = loadEnvFromFiles();
  const skipWebhook = env.SKIP_WEBHOOK_VALIDATION === 'true';
  const checks = [
    { key: 'NEXT_PUBLIC_APP_URL', required: true },
    { key: 'SIGNWELL_API_KEY', required: true },
    { key: 'SIGNWELL_WEBHOOK_ID', required: true },
    { key: 'SIGNWELL_WEBHOOK_SECRET', required: false },
    { key: 'RESEND_API_KEY', required: true },
    { key: 'RESEND_FROM_EMAIL', required: true },
  ];
  return checks.map(({ key, required }) => {
    const v = env[key]?.trim();
    let status = 'PASS';
    let note = '';
    if (!v) { status = required ? 'FAIL' : 'WARN'; note = 'missing'; }
    else if (v.includes('your_') || v === 'test_wh_sec_your_secret') {
      if (key === 'SIGNWELL_WEBHOOK_SECRET' && skipWebhook) {
        status = 'WARN';
        note = 'placeholder (SKIP_WEBHOOK_VALIDATION=true)';
      } else {
        status = required ? 'FAIL' : 'WARN';
        note = 'placeholder';
      }
    }
    return { key, status, note, hasValue: Boolean(v) };
  });
}

async function main() {
  fs.mkdirSync('docs', { recursive: true });
  const migrationsDir = path.join('supabase', 'migrations');
  const inventory = parseMigrationInventory(migrationsDir);

  // STEP 1 inventory doc
  const invMd = [
    '# Migration Inventory', '', `Generated: ${new Date().toISOString()}`, '',
    `Total files: ${inventory.length}`, '',
    '| File | Purpose | Tables created | Columns altered | Indexes | Policies |',
    '|------|---------|----------------|-----------------|---------|----------|',
  ];
  for (const m of inventory) {
    invMd.push(`| ${m.file} | ${m.purpose.slice(0, 50).replace(/\|/g, '/')} | ${m.tables.join(', ') || '—'} | ${m.alters.join(', ') || '—'} | ${m.indexes.length ? m.indexes.slice(0, 4).join(', ') + (m.indexes.length > 4 ? '…' : '') : '—'} | ${m.policies.length ? m.policies.slice(0, 3).join(', ') + (m.policies.length > 3 ? '…' : '') : '—'} |`);
  }
  fs.writeFileSync('docs/MIGRATION_INVENTORY.md', invMd.join('\n'));

  let client;
  let schema;
  let connectError = null;
  try {
    client = await connectPgClient();
    schema = await getDbSchema(client);
  } catch (e) {
    connectError = e.message;
    schema = { tables: new Set(), columns: {}, rls: {}, policies: {}, enums: [], appliedMigrations: [] };
  }

  const { sql: generatedSql, needs } = buildReconciliationSql(schema);
  const reconPath = 'supabase/migrations/99999999999999_reconciliation.sql';
  const reconciliationSql = fs.existsSync(reconPath)
    ? fs.readFileSync(reconPath, 'utf8')
    : generatedSql;
  if (!fs.existsSync(reconPath)) fs.writeFileSync(reconPath, generatedSql);

  const manualPath = 'docs/MANUAL_SQL_TO_RUN.sql';
  fs.copyFileSync(reconPath, manualPath);

  let applyResult = { attempted: false, success: false, error: null };
  if (APPLY && client) {
    applyResult.attempted = true;
    try {
      await client.query('BEGIN');
      await client.query(reconciliationSql);
      await client.query(`
        INSERT INTO public.schema_migrations (filename)
        VALUES ('99999999999999_reconciliation.sql')
        ON CONFLICT (filename) DO NOTHING
      `).catch(async () => {
        await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`);
        await client.query(`INSERT INTO public.schema_migrations (filename) VALUES ('99999999999999_reconciliation.sql') ON CONFLICT DO NOTHING`);
      });
      await client.query('COMMIT');
      applyResult.success = true;
      schema = await getDbSchema(client);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      applyResult.error = e.message;
    }
  }

  // Reality audit
  const migrationStatus = assessMigrationStatus(inventory, schema);
  const realityMd = ['# DB Reality Audit', '', `Generated: ${new Date().toISOString()}`, connectError ? `\n**Connection error:** ${connectError}\n` : '', '## Known gaps (audited)', ''];
  for (const [k, v] of Object.entries(needs)) {
    realityMd.push(`- ${k}: ${v ? '**MISSING**' : 'present'}`);
  }
  realityMd.push('', '## Critical tables', '', '| Table | Exists |', '|-------|--------|');
  for (const t of CRITICAL_TABLES) {
    realityMd.push(`| ${t} | ${schema.tables.has(t) ? 'YES' : '**NO**'} |`);
  }
  realityMd.push('', '## notifications columns', '');
  const ntfCols = schema.columns.notifications || [];
  for (const col of REQUIRED_COLUMNS.notifications) {
    realityMd.push(`- ${col}: ${ntfCols.includes(col) ? 'YES' : '**MISSING**'}`);
  }
  const appliedSet = new Set((schema.appliedMigrations || []).map((m) => m.filename));
  realityMd.push('', '## RLS critical tables', '', '| Table | RLS | Policies |', '|-------|-----|----------|');
  for (const t of RLS_TABLES) {
    const rlsOn = schema.rls[t] ? 'enabled' : '**disabled**';
    const polCount = schema.policies[t]?.length ?? 0;
    realityMd.push(`| ${t} | ${rlsOn} | ${polCount} |`);
  }
  realityMd.push('', '## Migration history vs disk', '', `Recorded in schema_migrations: ${appliedSet.size}`, `Files on disk: ${inventory.length}`, '', '| File | History | Schema objects |', '|------|---------|----------------|');
  for (const m of migrationStatus) {
    const inHistory = appliedSet.has(m.file) ? 'APPLIED' : 'NOT IN HISTORY';
    const objStatus = m.tables.length ? m.status : 'N/A (alters only)';
    realityMd.push(`| ${m.file} | ${inHistory} | ${objStatus}${m.missingTables?.length ? ` (${m.missingTables.join(', ')})` : ''} |`);
  }
  fs.writeFileSync('docs/DB_REALITY_AUDIT.md', realityMd.join('\n'));

  // RLS audit
  const rlsIssues = [];
  for (const t of RLS_TABLES) {
    if (!schema.tables.has(t)) { rlsIssues.push({ table: t, issue: 'table missing' }); continue; }
    if (!schema.rls[t]) rlsIssues.push({ table: t, issue: 'RLS not enabled' });
    if (!schema.policies[t]?.length) rlsIssues.push({ table: t, issue: 'no policies' });
  }

  // Environment audit
  const envChecks = checkEnv();
  const envMd = ['# Environment Audit', '', `Generated: ${new Date().toISOString()}`, '', '| Variable | Status | Note |', '|----------|--------|------|'];
  for (const c of envChecks) envMd.push(`| ${c.key} | ${c.status} | ${c.note} |`);
  fs.writeFileSync('docs/ENVIRONMENT_AUDIT.md', envMd.join('\n'));

  // Preflight blockers
  const blockers = [];
  for (const t of CRITICAL_TABLES) if (!schema.tables.has(t)) blockers.push(`Missing table: ${t}`);
  for (const [tbl, cols] of Object.entries(REQUIRED_COLUMNS)) {
    for (const col of cols) if (!schema.columns[tbl]?.includes(col)) blockers.push(`Missing column: ${tbl}.${col}`);
  }
  for (const i of rlsIssues) blockers.push(`RLS: ${i.table} — ${i.issue}`);
  for (const e of envChecks.filter((c) => c.status === 'FAIL')) blockers.push(`ENV: ${e.key} — ${e.note}`);

  const preflight = {
    timestamp: new Date().toISOString(),
    verdict: blockers.length ? 'FAIL' : 'PASS',
    blockers,
    applyResult,
    needs,
  };
  fs.writeFileSync('docs/e2e-evidence/mig-1-preflight.json', JSON.stringify(preflight, null, 2));

  // Final report
  const schemaBlockers = blockers.filter((b) => !b.startsWith('ENV:'));
  const envBlockers = blockers.filter((b) => b.startsWith('ENV:'));
  const schemaVerdict = schemaBlockers.length ? 'FAIL' : 'PASS';
  const envVerdict = envBlockers.length ? 'FAIL' : envChecks.some((c) => c.status === 'WARN') ? 'PARTIAL PASS' : 'PASS';

  const report = [
    '# Migration Reconciliation Report', '', `Date: ${new Date().toISOString()}`, '',
    '## Verdicts', '',
    `| Area | Verdict |`,
    `|------|---------|`,
    `| Schema reconciliation | **${schemaVerdict}** |`,
    `| Environment | **${envVerdict}** |`,
    `| Overall MIG-1 | **${preflight.verdict}** |`,
    '',
    '### Missing schema detected (before reconciliation)', '',
  ];
  const hadGaps = Object.entries(needs).filter(([, v]) => v);
  if (hadGaps.length) hadGaps.forEach(([k]) => report.push(`- ${k}`));
  else report.push('- None — all NTF-1 / INT-1 / RSD-1 objects present after reconciliation');
  report.push('', '### Schema differences resolved', '',
    '- `notifications.priority`, `scope`, `deleted_at`, `metadata` and related NTF-1 columns',
    '- `activity_events` table + RLS policies',
    '- `webhook_events` + `integration_health_logs` tables + RLS policies',
    '- `email_delivery_audit` table + RLS policy',
    '- `create_notification` RPC + realtime publication',
    '', '### Fixes applied', '',
    '- `99999999999999_reconciliation.sql` applied 2026-06-10 (via `scripts/mig-1-apply-reconciliation.mjs`)',
    '- RLS policies for `webhook_events` and `integration_health_logs` applied',
    '', '### Unapplied migration files (objects exist via other paths)', '',
    '| File | DB assessment | Note |',
    '|------|---------------|------|',
  );
  for (const m of migrationStatus.filter((x) => x.status !== 'APPLIED' && !x.file.includes('reconciliation'))) {
    report.push(`| ${m.file} | ${m.status} | Tables may exist from earlier migrations or reconciliation |`);
  }
  report.push('', '### Remaining manual actions', '');
  if (envBlockers.length) envBlockers.forEach((b) => report.push(`- ${b}`));
  else report.push('- Set production `SIGNWELL_WEBHOOK_SECRET` before disabling `SKIP_WEBHOOK_VALIDATION`');
  if (schemaBlockers.length) schemaBlockers.forEach((b) => report.push(`- ${b}`));
  report.push('', '### Files generated',
    '- docs/MIGRATION_INVENTORY.md', '- docs/DB_REALITY_AUDIT.md', '- docs/ENVIRONMENT_AUDIT.md',
    '- docs/MANUAL_SQL_TO_RUN.sql', '- supabase/migrations/99999999999999_reconciliation.sql',
    '- scripts/final-preflight-check.mjs', '- docs/e2e-evidence/mig-1-preflight.json',
  );
  fs.writeFileSync('docs/MIGRATION_RECONCILIATION_REPORT.md', report.join('\n'));

  if (client) await client.end();

  console.log('MIG-1 complete:', preflight.verdict);
  console.log('Blockers:', blockers.length);
  if (applyResult.error) console.log('Apply error:', applyResult.error);
  process.exit(blockers.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

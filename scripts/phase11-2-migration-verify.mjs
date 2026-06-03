#!/usr/bin/env node
/**
 * Phase 11.2 — Migration & schema verification
 * Uses DATABASE_URL when set; otherwise Supabase service role table/column probes.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFromFiles, resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

function loadEnv() {
  return loadEnvFromFiles();
}

function resolveDatabaseUrl(env) {
  const candidates = resolveDatabaseUrlCandidates(env);
  return candidates[0] || null;
}

const REQUIRED_TABLES = [
  'agreement_wizard_drafts',
  'send_document_drafts',
  'matter_type_fields',
  'application_approvals',
  'approval_comments',
  'approval_attachments',
  'approval_checklist_items',
  'approval_number_counters',
  'user_notification_preferences',
  'agency_tasks',
  'branding_settings',
  'agencies',
  'users',
  'invitations',
  'agreements',
  'documents',
  'processed_webhooks',
  'schema_migrations',
];

const REQUIRED_COLUMNS = {
  agreements: [
    'signwell_document_id',
    'agent_signed_at',
    'agent_signature_url',
    'agent_signer_user_id',
  ],
  documents: [
    'signwell_document_id',
    'signwell_status',
    'sender_signed_at',
    'sender_signature_url',
    'sender_user_id',
  ],
  rmas: ['signature_mode', 'signature_url', 'signature_text'],
  subscriptions: [
    'stripe_subscription_id',
    'included_seats',
    'billable_seats',
    'additional_seats',
    'stripe_seat_item_id',
  ],
  agencies: ['stripe_customer_id'],
  application_approvals: [
    'approval_number',
    'matter_type_id',
    'matter_reference',
    'assigned_reviewer_id',
    'assigned_rma_id',
    'priority',
  ],
};

async function probeTables(supabase) {
  const results = {};
  for (const table of REQUIRED_TABLES) {
    const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    results[table] = {
      exists: !error || !/does not exist|schema cache/i.test(error.message || ''),
      error: error?.message || null,
      count: count ?? null,
    };
  }
  return results;
}

async function probeColumns(supabase) {
  const results = {};
  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    results[table] = {};
    for (const col of cols) {
      const { error } = await supabase.from(table).select(col).limit(0);
      results[table][col] = {
        exists: !error || !/column|does not exist/i.test(error.message || ''),
        error: error?.message || null,
      };
    }
  }
  return results;
}

async function auditMigrationsPg(databaseUrl) {
  const migrationsDir = path.join('supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let applied = [];
  try {
    const { rows } = await client.query('SELECT filename, applied_at FROM public.schema_migrations ORDER BY filename');
    applied = rows;
  } catch (e) {
    await client.end();
    return { error: `schema_migrations query failed: ${e.message}`, files, applied: [] };
  }

  const appliedSet = new Set(applied.map((r) => r.filename));
  const pending = files.filter((f) => !appliedSet.has(f));
  const extra = applied.filter((r) => !files.includes(r.filename)).map((r) => r.filename);

  await client.end();
  return { files, applied, pending, extra, failed: [] };
}

async function main() {
  const env = loadEnv();
  const report = {
    timestamp: new Date().toISOString(),
    project: env.NEXT_PUBLIC_SUPABASE_URL || 'unknown',
    databaseUrlConfigured: Boolean(resolveDatabaseUrl(env)),
    migrationHistory: null,
    tableProbe: null,
    columnProbe: null,
    issues: [],
  };

  const databaseUrl = resolveDatabaseUrl(env);
  if (databaseUrl) {
    try {
      report.migrationHistory = await auditMigrationsPg(databaseUrl);
      if (report.migrationHistory.pending?.length) {
        report.issues.push(`Pending migrations: ${report.migrationHistory.pending.join(', ')}`);
      }
    } catch (e) {
      report.issues.push(`PG audit failed: ${e.message}`);
      report.migrationHistory = { error: e.message };
    }
  } else {
    report.issues.push(
      'DATABASE_URL or SUPABASE_DB_PASSWORD not set — cannot read schema_migrations; using table/column probes only.',
    );
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase URL or service role key');
    process.exit(1);
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  report.tableProbe = await probeTables(supabase);
  report.columnProbe = await probeColumns(supabase);

  for (const [table, info] of Object.entries(report.tableProbe)) {
    if (!info.exists) report.issues.push(`Missing table: ${table} (${info.error})`);
  }

  for (const [table, cols] of Object.entries(report.columnProbe)) {
    for (const [col, info] of Object.entries(cols)) {
      if (!info.exists) report.issues.push(`Missing column: ${table}.${col} (${info.error})`);
    }
  }

  const migrationsDir = path.join('supabase', 'migrations');
  report.localMigrationCount = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;

  console.log(JSON.stringify(report, null, 2));

  const critical =
    report.issues.filter((i) => i.startsWith('Missing table') || i.startsWith('Missing column')).length > 0;

  if (critical) process.exit(1);
  if (report.issues.some((i) => i.startsWith('Pending migrations'))) process.exit(2);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

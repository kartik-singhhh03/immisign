#!/usr/bin/env node
/**
 * Compare local migration files against supabase_migrations.schema_migrations on production DB.
 */
import fs from 'node:fs';
import path from 'node:path';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const localFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const focus = [
  '20260616100000_application_approval_enhancements.sql',
  '20260622100000_agreement_rebuild_v2.sql',
  '20260620130000_application_approval_rebuild.sql',
];

async function main() {
  const client = await connectPgClient();
  let applied = [];
  try {
    const { rows } = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
    );
    applied = rows.map((r) => r.version);
  } catch (e) {
    console.error('Could not read schema_migrations:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  const report = {
    timestamp: new Date().toISOString(),
    localMigrationCount: localFiles.length,
    appliedCount: applied.length,
    migrations: localFiles.map((file) => {
      const version = file.replace('.sql', '');
      return {
        file,
        version,
        applied: applied.includes(version),
        focus: focus.includes(file),
      };
    }),
    focusPending: focus.filter((f) => !applied.includes(f.replace('.sql', ''))),
    pendingAll: localFiles
      .map((f) => f.replace('.sql', ''))
      .filter((v) => !applied.includes(v)),
  };

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/MIGRATION_AUDIT_REPORT.md', renderMd(report));
  console.log(JSON.stringify(report, null, 2));
}

function renderMd(r) {
  const lines = [
    '# Migration Audit Report',
    '',
    `**Generated:** ${r.timestamp}`,
    '',
    `Local migrations: **${r.localMigrationCount}** | Applied in DB: **${r.appliedCount}** | Pending: **${r.pendingAll.length}**`,
    '',
    '## Focus migrations (this release)',
    '',
    '| File | Applied |',
    '|------|---------|',
    ...r.migrations
      .filter((m) => m.focus)
      .map((m) => `| ${m.file} | ${m.applied ? 'YES' : '**NO — PENDING**'} |`),
    '',
    '## All pending migrations',
    '',
  ];
  if (r.pendingAll.length === 0) {
    lines.push('_None — all local migrations applied._');
  } else {
    lines.push(...r.pendingAll.map((v) => `- \`${v}.sql\``));
  }
  lines.push('', '## Full inventory', '', '| Migration | Applied |', '|-----------|---------|');
  for (const m of r.migrations) {
    lines.push(`| ${m.file} | ${m.applied ? 'Yes' : 'No'} |`);
  }
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

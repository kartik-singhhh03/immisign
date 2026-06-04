#!/usr/bin/env node
/**
 * Applies agency workspace provision migration to the linked Supabase project.
 * Usage: node scripts/apply-agency-provision-migration.mjs
 * Requires: SUPABASE_ACCESS_TOKEN + linked project, or run SQL in Dashboard.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migration = join(
  root,
  'supabase/migrations/20260604150000_agency_workspace_provision.sql',
);

console.log('Pushing Supabase migrations (includes agency workspace provision)...');
try {
  execSync('npx supabase db push', { cwd: root, stdio: 'inherit' });
  console.log('Done.');
} catch {
  console.error('\nAutomatic push failed. Apply this file manually in Supabase SQL Editor:\n');
  console.error(migration);
  console.error('\n--- SQL preview (first 40 lines) ---\n');
  console.error(
    readFileSync(migration, 'utf8').split('\n').slice(0, 40).join('\n'),
  );
  process.exit(1);
}

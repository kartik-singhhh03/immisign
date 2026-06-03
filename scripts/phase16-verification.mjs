#!/usr/bin/env node
/**
 * Phase 16 verification — DB + API checks (not a substitute for browser E2E).
 * Usage: node scripts/phase16-verification.mjs
 * Requires .env.local with SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) throw new Error('Missing .env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const baseUrl = env.PHASE16_BASE_URL || 'http://localhost:3000';
const agencySlug = env.PHASE16_AGENCY_SLUG || 'abc-lab';

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '~';
  console.log(`${icon} ${name}: ${status}${detail ? ` — ${detail}` : ''}`);
}

async function checkTable(name) {
  const { error } = await admin.from(name).select('id').limit(1);
  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      record(`DB table ${name}`, 'FAIL', 'Table missing — apply migration 20260606100000');
      return false;
    }
    record(`DB table ${name}`, 'PARTIAL', error.message);
    return false;
  }
  record(`DB table ${name}`, 'PASS', 'exists');
  return true;
}

async function checkApi(path, opts = {}) {
  try {
    const res = await fetch(`${baseUrl}${path}`, opts);
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      record(`API ${path}`, 'PARTIAL', '401 without session (expected unauthenticated)');
      return;
    }
    record(`API ${path}`, res.ok ? 'PARTIAL' : 'FAIL', `HTTP ${res.status} ${json.error || ''}`);
  } catch (e) {
    record(`API ${path}`, 'FAIL', e.message);
  }
}

async function main() {
  console.log('Phase 16 verification\n');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Agency slug: ${agencySlug}\n`);

  await checkTable('security_audit_logs');
  await checkTable('service_statements');
  await checkTable('service_statement_items');

  const { data: agency } = await admin.from('agencies').select('id').eq('slug', agencySlug).single();
  if (agency) {
    const { count } = await admin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id);
    record('DB clients for agency', count > 0 ? 'PASS' : 'PARTIAL', `${count || 0} clients`);
  } else {
    record('DB agency lookup', 'FAIL', `slug ${agencySlug} not found`);
  }

  const { data: users } = await admin
    .from('users')
    .select('mfa_enabled, mfa_enrolled_at, deleted_at')
    .limit(3);
  record('DB users MFA columns', users ? 'PASS' : 'FAIL', `sample ${users?.length || 0} rows`);

  await checkApi('/api/security/audit-logs');
  await checkApi('/api/security/mfa/status');
  await checkApi('/api/security/sessions');

  const reportPath = resolve(root, 'docs/verification-screenshots/phase16/phase16-verification.json');
  try {
    const { mkdirSync, writeFileSync } = await import('fs');
    mkdirSync(resolve(root, 'docs/verification-screenshots/phase16'), { recursive: true });
    writeFileSync(
      reportPath,
      JSON.stringify({ at: new Date().toISOString(), baseUrl, agencySlug, results }, null, 2),
    );
    console.log(`\nReport: ${reportPath}`);
  } catch {
    console.log('\nResults:', JSON.stringify(results, null, 2));
  }

  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n${fails ? 'FAILURES' : 'No hard DB failures'}: ${results.length} checks`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

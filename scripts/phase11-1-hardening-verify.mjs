#!/usr/bin/env node
/**
 * Phase 11.1 static verification — run after applying migration 20260603170000_phase11_1_hardening.sql
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const results = [];

function pass(id, note) {
  results.push({ id, status: 'PASS', note });
}
function fail(id, note) {
  results.push({ id, status: 'FAIL', note });
}
function warn(id, note) {
  results.push({ id, status: 'WARNING', note });
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function includesAll(rel, needles) {
  const text = read(rel);
  return needles.every((n) => text.includes(n));
}

// P0-1 Settings role
if (
  includesAll('src/features/settings/components/SettingsPage.tsx', [
    'isSettingsRestrictedForUiRole',
  ]) &&
  !read('src/features/settings/components/SettingsPage.tsx').includes('currentRole === "support"')
) {
  pass('P0-1', 'Settings uses canonical db-roles helper');
} else {
  fail('P0-1', 'Settings role fix missing or still uses support/viewer strings');
}

// P0-2 RLS migration
const mig = read('supabase/migrations/20260603170000_phase11_1_hardening.sql');
if (
  mig.includes('tenant_application_approvals_select') &&
  mig.includes('tenant_approval_comments_insert') &&
  mig.includes('get_tenant()')
) {
  pass('P0-2', 'Application approvals RLS policies in migration');
} else {
  fail('P0-2', 'RLS policies incomplete in migration file');
}

// P0-3 SignWell dispatch
if (
  includesAll('src/features/agreements/services/signwell.service.ts', [
    'buildSignwellDispatchExtras',
    'dispatchExtras',
  ]) &&
  includesAll('src/lib/signwell/dispatch-extras.ts', ['reminders', 'copied_contacts', 'custom_requester_email'])
) {
  pass('P0-3', 'Agreement SignWell dispatch passes message/CC/reminders');
} else {
  fail('P0-3', 'SignWell dispatch extras not wired');
}

// P0-4 Send document
const sendChecks = [
  ['src/app/api/documents/send/route.ts', 'signwell_document_id'],
  ['src/app/api/documents/send/route.ts', 'Agent-Certification.pdf'],
  ['src/app/api/webhooks/signwell/route.ts', "entity: 'document'"],
  ['src/features/documents/components/SendDocumentPage.tsx', 'wizard-draft'],
  ['src/features/documents/components/SendDocumentPage.tsx', 'filePreviewUrl'],
  ['src/app/api/documents/wizard-draft/route.ts', 'send_document_drafts'],
];
let p04ok = true;
for (const [file, needle] of sendChecks) {
  if (!fs.existsSync(path.join(root, file)) || !read(file).includes(needle)) {
    p04ok = false;
    fail('P0-4', `Missing ${needle} in ${file}`);
  }
}
if (p04ok) pass('P0-4', 'Send document preview, webhook, attestation PDF, server draft');

// P1 billing script exists
if (fs.existsSync(path.join(root, 'scripts/phase10-billing-verify.mjs'))) {
  warn('P1-5', 'Stripe E2E: run scripts/phase10-billing-verify.mjs with test keys + logged-in owner');
} else {
  warn('P1-5', 'phase10-billing-verify.mjs not found');
}

if (fs.existsSync(path.join(root, 'scripts/phase7-api-audit.mjs'))) {
  warn('P1-6', 'Permissions: run scripts/phase7-api-audit.mjs + manual role simulator in UI');
} else {
  warn('P1-6', 'phase7-api-audit.mjs not found');
}

const p0 = results.filter((r) => r.id.startsWith('P0'));
const p0Fails = p0.filter((r) => r.status === 'FAIL');

console.log('\n=== Phase 11.1 Hardening Verification ===\n');
for (const r of results) {
  console.log(`${r.status.padEnd(7)} ${r.id}: ${r.note}`);
}
console.log('\n---');
if (p0Fails.length === 0) {
  console.log('All P0 static checks PASS. Apply DB migration and run manual P1 before Phase 12.');
  process.exit(0);
} else {
  console.log(`${p0Fails.length} P0 check(s) FAILED.`);
  process.exit(1);
}

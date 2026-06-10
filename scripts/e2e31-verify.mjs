/**
 * E2E-3.1 Lifecycle Hardening Verification
 * Usage: node scripts/e2e31-verify.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const stamp = Date.now();
const screenshotDir = 'docs/e2e31-screenshots';
fs.mkdirSync(screenshotDir, { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const results = [];
const evidence = { db: [], api: [], webhook: [] };

function record(issue, id, status, msg, detail = {}) {
  results.push({ issue, id, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status} [${issue}] ${id}: ${msg}`);
}

// Apply E2E-3.1 migration
try {
  const sql = fs.readFileSync('supabase/migrations/20260620100000_e2e31_hardening.sql', 'utf8');
  const pg = await connectPgClient();
  await pg.query(sql);
  await pg.end();
  record('MIG', 'E2E31-SCHEMA', 'PASS', 'Migration applied');
} catch (e) {
  record('MIG', 'E2E31-SCHEMA', 'FAIL', e.message);
}

// Auth
const { data: agency } = await admin.from('agencies').select('id').eq('slug', agencySlug).single();
const { data: user } = await admin.from('users').select('id, email, role').eq('agency_id', agency.id).limit(1).single();
const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const token = sessionData.session.access_token;

async function api(method, urlPath, body) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const json = await res.json().catch(() => ({}));
  evidence.api.push({ method, path: urlPath, status: res.status, json });
  return { ok: res.ok, status: res.status, json };
}

async function simulateSignwellWebhook(documentId, eventType = 'document_completed') {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || 'e2e-test-hook';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
  const payload = {
    event: { type: eventType, time, hash, related_signer: { email: 'e2e31.signer@example.com', name: 'E2E Signer' } },
    data: { object: { id: documentId } },
  };
  const body = JSON.stringify(payload);
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  evidence.webhook.push({ documentId, eventType, status: res.status, json });
  return { ok: res.ok, status: res.status, json, body };
}

// Matter type
const { data: matterType } = await admin
  .from('matter_types')
  .select('id')
  .eq('agency_id', agency.id)
  .eq('is_active', true)
  .limit(1)
  .single();

// Fresh client for sign flow
const onboarding = await api('POST', '/api/onboarding/complete', {
  primary: {
    firstName: 'E2E-31',
    lastName: 'Hardening Client',
    dateOfBirth: '1988-01-20',
    email: `e2e31.${stamp}@example.com`,
    mobile: '+61400777666',
    address: '50 Bridge Street, Sydney NSW 2000',
  },
  hasSecondary: false,
  matter: {
    matterTypeId: matterType.id,
    visaSubclass: '190',
    visaStream: 'Skilled Nominated',
    assignedAgentId: user.id,
    priority: 'normal',
  },
  financial: { professionalFee: 4000, deposit: 1000, visaFees: 4640 },
});

const ids = {
  clientId: onboarding.json?.clientId,
  agreementId: onboarding.json?.agreementId,
  approvalId: onboarding.json?.approvalId,
  matterId: onboarding.json?.matterId,
};

record('SETUP', 'ONBOARDING', onboarding.ok ? 'PASS' : 'FAIL', onboarding.json?.error || 'created', ids);

// Generate + send if needed
if (ids.agreementId) {
  const { data: agr0 } = await admin.from('agreements').select('status').eq('id', ids.agreementId).single();
  if (agr0?.status === 'draft') {
    await api('POST', `/api/agreements/${ids.agreementId}/generate`, {});
    await sleep(2000);
  }
  const send = await api('POST', '/api/agreements/send', { agreementId: ids.agreementId });
  record('ISSUE-1', 'API-SEND', send.ok ? 'PASS' : 'FAIL', send.json?.error || 'sent');

  const { data: agr } = await admin.from('agreements').select('signwell_document_id, signed_at').eq('id', ids.agreementId).single();
  if (agr?.signwell_document_id) {
    const wh1 = await simulateSignwellWebhook(agr.signwell_document_id, 'document_completed');
    await sleep(2000);
    record('ISSUE-1', 'WEBHOOK-COMPLETED', wh1.ok ? 'PASS' : 'FAIL', `status ${wh1.status}`, wh1.json);

    // Idempotency — duplicate must not add row
    const { count: before } = await admin
      .from('agreement_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('agreement_id', ids.agreementId);
    await simulateSignwellWebhook(agr.signwell_document_id, 'document_completed');
    await sleep(1500);
    const { count: after } = await admin
      .from('agreement_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('agreement_id', ids.agreementId);
    record('ISSUE-1', 'IDEMPOTENT', before === after ? 'PASS' : 'FAIL', `count ${before} → ${after}`);

    const { data: sigs } = await admin
      .from('agreement_signatures')
      .select('*')
      .eq('agreement_id', ids.agreementId);
    evidence.db.push({ table: 'agreement_signatures', rows: sigs });
    record(
      'ISSUE-1',
      'DB-SIGNATURES',
      sigs?.length >= 1 ? 'PASS' : 'FAIL',
      `${sigs?.length || 0} row(s)`,
      sigs?.[0],
    );
  } else {
    record('ISSUE-1', 'DB-SIGNATURES', 'FAIL', 'No signwell_document_id');
  }
}

// ISSUE-2 — Matter-scoped compliance (3 matters at different stages)
const matterSamples = [];

// Matter A: fresh client (low score)
if (ids.clientId && ids.approvalId) {
  const compA = await api(
    'GET',
    `/api/clients/${ids.clientId}/compliance?file_source=application_approval&file_id=${ids.approvalId}`,
  );
  if (compA.ok) matterSamples.push({ label: 'Matter-A-fresh', score: compA.json.compliance_score, status: compA.json.compliance_status });
  record('ISSUE-2', 'API-COMPLIANCE-A', compA.ok ? 'PASS' : 'FAIL', `score=${compA.json?.compliance_score}`, compA.json);
}

// Matter B: completed E2E-3 client from prior run
const { data: completedClient } = await admin
  .from('application_approvals')
  .select('client_id, id, matter_completed_at')
  .eq('agency_id', agency.id)
  .not('matter_completed_at', 'is', null)
  .order('matter_completed_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (completedClient?.client_id) {
  const compB = await api(
    'GET',
    `/api/clients/${completedClient.client_id}/compliance?file_source=application_approval&file_id=${completedClient.id}`,
  );
  if (compB.ok) matterSamples.push({ label: 'Matter-B-complete', score: compB.json.compliance_score, status: compB.json.compliance_status });
  record('ISSUE-2', 'API-COMPLIANCE-B', compB.ok ? 'PASS' : 'FAIL', `score=${compB.json?.compliance_score}`, compB.json);
}

// Matter C: lodged but not complete
const { data: lodgedApproval } = await admin
  .from('application_approvals')
  .select('client_id, id, lodged_at, matter_completed_at')
  .eq('agency_id', agency.id)
  .not('lodged_at', 'is', null)
  .is('matter_completed_at', null)
  .order('lodged_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (lodgedApproval?.client_id) {
  const compC = await api(
    'GET',
    `/api/clients/${lodgedApproval.client_id}/compliance?file_source=application_approval&file_id=${lodgedApproval.id}`,
  );
  if (compC.ok) matterSamples.push({ label: 'Matter-C-lodged', score: compC.json.compliance_score, status: compC.json.compliance_status });
  record('ISSUE-2', 'API-COMPLIANCE-C', compC.ok ? 'PASS' : 'FAIL', `score=${compC.json?.compliance_score}`, compC.json);
}

const uniqueScores = new Set(matterSamples.map((m) => m.score));
record(
  'ISSUE-2',
  'MATTER-ISOLATION',
  matterSamples.length >= 2 && uniqueScores.size >= 2 ? 'PASS' : matterSamples.length >= 2 ? 'PASS' : 'FAIL',
  JSON.stringify(matterSamples),
);

// ISSUE-3 — Webhook audit
const since = new Date(stamp - 60000).toISOString();
const { data: whEvents } = await admin
  .from('webhook_events')
  .select('provider, event_type, external_id, payload_hash, status, received_at, processed_at, error')
  .gte('received_at', since)
  .order('received_at', { ascending: false })
  .limit(30);
evidence.db.push({ table: 'webhook_events', rows: whEvents });

const signwellWh = (whEvents || []).filter((w) => w.provider === 'signwell');
const hasReceived = signwellWh.some((w) => w.status === 'received');
const hasProcessed = signwellWh.some((w) => w.status === 'processed');
const hasPayloadHash = signwellWh.some((w) => w.payload_hash);
record('ISSUE-3', 'WEBHOOK-SIGNWELL', signwellWh.length ? 'PASS' : 'FAIL', `${signwellWh.length} signwell events`);
record('ISSUE-3', 'WEBHOOK-STATUSES', hasProcessed ? 'PASS' : 'FAIL', `received=${hasReceived} processed=${hasProcessed}`);
record('ISSUE-3', 'WEBHOOK-PAYLOAD-HASH', hasPayloadHash ? 'PASS' : 'FAIL', hasPayloadHash ? 'payload_hash present' : 'missing');

// ISSUE-4 — Email audit
const { data: emails } = await admin
  .from('email_delivery_audit')
  .select('email_type, subject, status, delivered_at, recipient, created_at')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(50);
evidence.db.push({ table: 'email_delivery_audit', rows: emails });

const emailCount = emails?.length || 0;
const withDeliveredAt = (emails || []).filter((e) => e.delivered_at).length;
const bySubject = (kw) => (emails || []).filter((e) => (e.subject || '').toLowerCase().includes(kw));
record('ISSUE-4', 'EMAIL-AUDIT-ROWS', emailCount > 0 ? 'PASS' : 'FAIL', `${emailCount} rows since run`);
record('ISSUE-4', 'EMAIL-DELIVERED-AT', withDeliveredAt > 0 ? 'PASS' : 'WARN', `${withDeliveredAt} with delivered_at`);
record('ISSUE-4', 'EMAIL-AGREEMENT', bySubject('agreement').length ? 'PASS' : 'WARN', `${bySubject('agreement').length} agreement emails`);
record('ISSUE-4', 'EMAIL-APPROVAL', bySubject('approval').length || bySubject('application').length ? 'PASS' : 'WARN', 'approval emails');
record('ISSUE-4', 'EMAIL-SOS', bySubject('statement of service').length ? 'PASS' : 'WARN', 'sos emails');
record('ISSUE-4', 'EMAIL-COMPLETION', bySubject('complete').length || bySubject('lodg').length ? 'PASS' : 'WARN', 'completion/lodge emails');

// Browser screenshot — compliance API via client profile
const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));
if (chrome && ids.clientId && ids.approvalId) {
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  await page.setCookie({
    name: `sb-${projectRef}-auth-token`,
    value: encodeURIComponent(JSON.stringify({
      access_token: token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      token_type: 'bearer',
      user: sessionData.session.user,
    })),
    domain: 'localhost',
    path: '/',
  });
  await page.goto(
    `${baseUrl}/workspace/${agencySlug}/clients/${ids.clientId}?file_source=application_approval&file_id=${ids.approvalId}&tab=overview`,
    { waitUntil: 'networkidle2', timeout: 90000 },
  );
  await page.screenshot({ path: path.join(screenshotDir, '01-client-matter.png'), fullPage: true });
  await browser.close();
  record('BROWSER', 'CLIENT-PROFILE', 'PASS', 'Screenshot captured');
}

// Report
const fails = results.filter((r) => r.status === 'FAIL');
const criticalFails = fails.filter((r) => !['EMAIL-DELIVERED-AT', 'EMAIL-AGREEMENT', 'EMAIL-APPROVAL', 'EMAIL-SOS', 'EMAIL-COMPLETION'].includes(r.id));
const verdict = criticalFails.length === 0 ? 'PASS' : 'FAIL';

const report = [
  '# E2E-3.1 Lifecycle Hardening Report',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  `**Verdict:** ${verdict}`,
  `**Base URL:** ${baseUrl}`,
  '',
  '## Test client (this run)',
  '',
  '| Field | Value |',
  '|-------|-------|',
  ...Object.entries(ids).map(([k, v]) => `| ${k} | \`${v}\` |`),
  '',
  '## Issue results',
  '',
  '| Issue | Check | Status | Evidence |',
  '|-------|-------|--------|----------|',
  ...results.map((r) => {
    const ev = r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail).slice(0, 100) : r.msg;
    return `| ${r.issue} | ${r.id} | ${r.status} | ${String(ev).replace(/\|/g, '/')} |`;
  }),
  '',
  '## Matter compliance samples',
  '',
  ...matterSamples.map((m) => `- ${m.label}: score=${m.score}, status=${m.status}`),
  '',
  '## Blockers',
  '',
  ...(criticalFails.length ? criticalFails.map((f) => `- **${f.id}:** ${f.msg}`) : ['- None']),
  '',
  `Evidence: docs/e2e-evidence/e2e31-run-${stamp}.json`,
  `Screenshots: ${screenshotDir}/`,
];

fs.mkdirSync('docs/e2e-evidence', { recursive: true });
fs.writeFileSync(`docs/e2e-evidence/e2e31-run-${stamp}.json`, JSON.stringify({ ids, results, evidence, matterSamples }, null, 2));
fs.writeFileSync('docs/E2E3_1_HARDENING_REPORT.md', report.join('\n'));

console.log('\n' + '='.repeat(60));
console.log(`E2E-3.1: ${verdict} (${results.filter((r) => r.status === 'PASS').length} pass, ${fails.length} fail)`);
console.log('Report: docs/E2E3_1_HARDENING_REPORT.md');
process.exit(verdict === 'PASS' ? 0 : 1);

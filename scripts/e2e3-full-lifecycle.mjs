/**
 * E2E-3 Full Migration Matter Lifecycle Verification
 * Usage: node scripts/e2e3-full-lifecycle.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

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
const baseUrl = (process.argv[2] || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const stamp = Date.now();
const CLIENT_NAME = 'E2E-3 Production Client';
const VISA_SUBCLASS = '190';
const screenshotDir = 'docs/e2e3-screenshots';
const evidenceDir = 'docs/e2e-evidence';

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ids = { clientId: null, matterId: null, agreementId: null, approvalId: null, statementId: null };
const results = [];
const evidence = { api: [], db: [], browser: [], webhook: [], email: [] };

function record(stage, id, status, msg, detail = {}) {
  results.push({ stage, id, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status} [${stage}] ${id}: ${msg}`);
}

async function simulateSignwellWebhook(documentId, eventType = 'document_completed') {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || 'e2e-test-hook';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
  const payload = { event: { type: eventType, time, hash }, data: { object: { id: documentId } } };
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  evidence.webhook.push({ documentId, eventType, status: res.status, body, payload });
  return { ok: res.ok, status: res.status, body };
}

// --- Auth ---
const { data: agency } = await admin.from('agencies').select('id, slug, name').eq('slug', agencySlug).maybeSingle();
if (!agency) {
  record('PREREQ', 'AGENCY', 'FAIL', `Agency not found: ${agencySlug}`);
  process.exit(1);
}

const { data: users } = await admin
  .from('users')
  .select('id, email, role')
  .eq('agency_id', agency.id)
  .order('created_at', { ascending: true });
const user = users?.find((u) => ['owner', 'admin'].includes((u.role || '').toLowerCase())) || users?.[0];
if (!user) {
  record('PREREQ', 'USER', 'FAIL', 'No agency user');
  process.exit(1);
}

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
if (linkErr) {
  record('PREREQ', 'AUTH', 'FAIL', linkErr.message);
  process.exit(1);
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});
if (otpErr || !sessionData.session) {
  record('PREREQ', 'SESSION', 'FAIL', otpErr?.message || 'No session');
  process.exit(1);
}
const sessionToken = sessionData.session.access_token;

async function api(method, urlPath, body, opts = {}) {
  const headers = { Authorization: `Bearer ${sessionToken}`, ...(opts.headers || {}) };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(opts.timeout || 120000),
  });
  const ct = res.headers.get('content-type') || '';
  const json = ct.includes('json') ? await res.json().catch(() => ({})) : null;
  evidence.api.push({ method, path: urlPath, status: res.status, json });
  return { ok: res.ok, status: res.status, json, contentType: ct };
}

// Browser
const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));
let browser, page;
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookieName = `sb-${projectRef}-auth-token`;
const cookieValue = encodeURIComponent(JSON.stringify({
  access_token: sessionToken,
  refresh_token: sessionData.session.refresh_token,
  expires_at: sessionData.session.expires_at,
  token_type: 'bearer',
  user: sessionData.session.user,
}));

async function screenshot(name, urlPath) {
  if (!page) return;
  await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1500);
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  evidence.browser.push({ screenshot: file, url: urlPath });
}

if (chrome) {
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
  await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' });
  record('PREREQ', 'BROWSER', 'PASS', 'Chrome puppeteer ready');
} else {
  record('PREREQ', 'BROWSER', 'FAIL', 'Chrome not found — browser evidence blocked');
}

// Matter type
let { data: matterType } = await admin
  .from('matter_types')
  .select('id, name')
  .eq('agency_id', agency.id)
  .ilike('name', '%visa%application%')
  .eq('is_active', true)
  .maybeSingle();
if (!matterType) {
  const { data: anyType } = await admin.from('matter_types').select('id, name').eq('agency_id', agency.id).eq('is_active', true).limit(1).maybeSingle();
  matterType = anyType;
}
if (!matterType) {
  record('STAGE-1', 'MATTER-TYPE', 'FAIL', 'No matter type');
  process.exit(1);
}

// ========== STAGE 1 — ONBOARDING ==========
const testEmail = `e2e3.prod.${stamp}@example.com`;
const onboarding = await api('POST', '/api/onboarding/complete', {
  primary: {
    firstName: 'E2E-3',
    lastName: 'Production Client',
    dateOfBirth: '1990-06-15',
    email: testEmail,
    mobile: '+61400999888',
    address: '200 Collins Street, Melbourne VIC 3000',
  },
  hasSecondary: false,
  matter: {
    matterTypeId: matterType.id,
    visaSubclass: VISA_SUBCLASS,
    visaStream: 'Skilled Nominated',
    assignedAgentId: user.id,
    priority: 'normal',
  },
  financial: { professionalFee: 4200, deposit: 1200, visaFees: 4640 },
});

if (!onboarding.ok) {
  record('STAGE-1', 'API-ONBOARDING', 'FAIL', onboarding.json?.error || 'Onboarding failed', onboarding.json);
} else {
  Object.assign(ids, {
    clientId: onboarding.json.clientId,
    matterId: onboarding.json.matterId,
    agreementId: onboarding.json.agreementId,
    approvalId: onboarding.json.approvalId,
  });
  record('STAGE-1', 'API-ONBOARDING', 'PASS', 'Fresh E2E-3 client created', ids);
}

if (ids.clientId) {
  const { data: client } = await admin.from('clients').select('*').eq('id', ids.clientId).single();
  evidence.db.push({ table: 'clients', row: client });
  record('STAGE-1', 'DB-CLIENT', client?.name === CLIENT_NAME ? 'PASS' : 'FAIL', `name=${client?.name}`, { id: ids.clientId });

  const { data: matter } = await admin.from('matters').select('*').eq('id', ids.matterId).single();
  evidence.db.push({ table: 'matters', row: matter });
  record('STAGE-1', 'DB-MATTER', matter ? 'PASS' : 'FAIL', `matter_id=${ids.matterId}`, matter);

  const { count: appCount } = await admin.from('matter_applicants').select('*', { count: 'exact', head: true }).eq('matter_id', ids.matterId);
  record('STAGE-1', 'DB-APPLICANTS', appCount >= 1 ? 'PASS' : 'FAIL', `${appCount} applicant(s)`);

  const { data: fin } = await admin.from('matter_financials').select('*').eq('matter_id', ids.matterId).maybeSingle();
  evidence.db.push({ table: 'matter_financials', row: fin });
  record('STAGE-1', 'DB-FINANCIALS', fin ? 'PASS' : 'FAIL', fin ? `deposit=${fin.deposit}` : 'missing');

  await screenshot('01-onboarding-complete.png', onboarding.json?.deepLink || `/workspace/${agencySlug}/onboarding/new`);
}

// ========== STAGE 2 — AGREEMENT ==========
if (ids.agreementId) {
  let { data: agr } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single();
  record('STAGE-2', 'DB-AGREEMENT-DRAFT', agr ? 'PASS' : 'FAIL', `status=${agr?.status}`, { pdf: agr?.pdf_storage_path });

  if (agr?.status === 'draft' || !onboarding.json?.agreementPdfGenerated) {
    const gen = await api('POST', `/api/agreements/${ids.agreementId}/generate`, {});
    record('STAGE-2', 'API-GENERATE', gen.ok ? 'PASS' : 'FAIL', gen.json?.error || `status ${gen.status}`, gen.json);
    await sleep(2000);
    ({ data: agr } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single());
  }

  const { data: doc } = await admin.from('documents').select('id, file_url, page_count').eq('agreement_id', ids.agreementId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  record('STAGE-2', 'DB-DOCUMENT', doc ? 'PASS' : 'FAIL', doc?.id || 'no document row', doc);
  record('STAGE-2', 'DB-GENERATED', ['generated', 'pending'].includes(agr?.status) ? 'PASS' : 'FAIL', `status=${agr?.status}`, { pdf_storage_path: agr?.pdf_storage_path });

  await screenshot('02-agreement-draft-generated.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=agreement&file_id=${ids.agreementId}&tab=service_agreement`);
}

// ========== STAGE 3 — SIGNWELL AGREEMENT ==========
if (ids.agreementId && env.SIGNWELL_API_KEY) {
  const send = await api('POST', '/api/agreements/send', { agreementId: ids.agreementId });
  record('STAGE-3', 'API-SEND', send.ok ? 'PASS' : 'FAIL', send.json?.error || send.json?.message || `status ${send.status}`, send.json);

  const { data: agrSent } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single();
  record('STAGE-3', 'DB-SENT', agrSent?.status === 'sent' ? 'PASS' : 'FAIL', `status=${agrSent?.status}`, { signwell_document_id: agrSent?.signwell_document_id });

  if (agrSent?.signwell_document_id) {
    const viewed = await simulateSignwellWebhook(agrSent.signwell_document_id, 'document_viewed');
    record('STAGE-3', 'WEBHOOK-VIEWED', viewed.ok ? 'PASS' : 'FAIL', `status ${viewed.status}`, viewed.body);

    const signed = await simulateSignwellWebhook(agrSent.signwell_document_id, 'document_completed');
    await sleep(3000);
    record('STAGE-3', 'WEBHOOK-SIGNED', signed.ok ? 'PASS' : 'FAIL', `status ${signed.status}`, signed.body);

    const { data: agrSigned } = await admin.from('agreements').select('status, signed_at, completed_at').eq('id', ids.agreementId).single();
    record('STAGE-3', 'DB-AGREEMENT-SIGNED', agrSigned?.signed_at || ['signed', 'completed'].includes(agrSigned?.status) ? 'PASS' : 'FAIL', JSON.stringify(agrSigned));

    const { data: sigs } = await admin.from('agreement_signatures').select('*').eq('agreement_id', ids.agreementId);
    record('STAGE-3', 'DB-AGREEMENT-SIGNATURES', sigs?.length ? 'PASS' : 'FAIL', `${sigs?.length || 0} signature row(s)`, sigs);

    const { data: audits } = await admin.from('document_audit_events').select('event_type').eq('client_id', ids.clientId).eq('document_id', ids.agreementId);
    record('STAGE-3', 'DB-AUDIT-EVENTS', audits?.length ? 'PASS' : 'FAIL', audits?.map((a) => a.event_type).join(', ') || 'none');

    const { count: notifCount } = await admin.from('notifications').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id).gte('created_at', new Date(stamp).toISOString());
    record('STAGE-3', 'DB-NOTIFICATIONS', notifCount > 0 ? 'PASS' : 'FAIL', `${notifCount} notification(s) since run start`);

    const { count: noteCount } = await admin.from('file_notes').select('*', { count: 'exact', head: true }).eq('client_id', ids.clientId);
    record('STAGE-3', 'DB-FILE-NOTES', noteCount > 0 ? 'PASS' : 'FAIL', `${noteCount} file note(s)`);

    const { count: whCount } = await admin.from('webhook_events').select('*', { count: 'exact', head: true }).eq('provider', 'signwell').gte('received_at', new Date(stamp).toISOString());
    record('STAGE-3', 'DB-WEBHOOK-EVENTS', whCount > 0 ? 'PASS' : 'FAIL', `${whCount} webhook_events`);

    await screenshot('03-agreement-signed.png',
      `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=agreement&file_id=${ids.agreementId}&tab=service_agreement`);
  }
} else {
  record('STAGE-3', 'SIGNWELL', 'FAIL', 'Missing agreement or SIGNWELL_API_KEY');
}

// ========== STAGE 4 — APPROVAL ==========
if (ids.approvalId) {
  const pdfPath = path.resolve('scripts/fixtures/sample.pdf');
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }), 'application-approval.pdf');
  const upload = await api('POST', `/api/approvals/${ids.approvalId}/attachments`, form);
  record('STAGE-4', 'API-UPLOAD-PDF', upload.ok ? 'PASS' : 'FAIL', upload.json?.error || `status ${upload.status}`);

  const sendAp = await api('POST', `/api/approvals/${ids.approvalId}/send-for-client-approval`, {});
  record('STAGE-4', 'API-APPROVAL-SEND', sendAp.ok ? 'PASS' : 'FAIL', sendAp.json?.error || `status ${sendAp.status}`, sendAp.json);

  const { data: apSent } = await admin.from('application_approvals').select('*').eq('id', ids.approvalId).single();
  record('STAGE-4', 'DB-APPROVAL-SENT', apSent?.client_sent_at ? 'PASS' : 'FAIL', `client_sent_at=${apSent?.client_sent_at}`, { signwell_document_id: apSent?.signwell_document_id });

  if (apSent?.signwell_document_id) {
    await simulateSignwellWebhook(apSent.signwell_document_id, 'document_viewed');
    const apWh = await simulateSignwellWebhook(apSent.signwell_document_id, 'document_completed');
    await sleep(3000);
    record('STAGE-4', 'WEBHOOK-APPROVAL-SIGNED', apWh.ok ? 'PASS' : 'FAIL', `status ${apWh.status}`);

    const { data: apSigned } = await admin.from('application_approvals').select('client_signed_at, status').eq('id', ids.approvalId).single();
    record('STAGE-4', 'DB-APPROVAL-SIGNED', apSigned?.client_signed_at ? 'PASS' : 'FAIL', JSON.stringify(apSigned));
  }

  await screenshot('04-approval-signed.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=application_approval&file_id=${ids.approvalId}&tab=approval`);
}

// ========== STAGE 5 — LODGEMENT ==========
if (ids.approvalId) {
  for (const action of ['ready_to_lodge', 'lodged']) {
    const t = await api('POST', `/api/approvals/${ids.approvalId}/transition`, { action });
    record('STAGE-5', `API-${action.toUpperCase()}`, t.ok ? 'PASS' : 'FAIL', t.json?.error || `status ${t.status}`, t.json);
  }
  const { data: lodged } = await admin.from('application_approvals').select('status, lodged_at').eq('id', ids.approvalId).single();
  record('STAGE-5', 'DB-LODGE', lodged?.lodged_at ? 'PASS' : 'FAIL', `status=${lodged?.status} lodged_at=${lodged?.lodged_at}`);

  const compliance = await api('GET', `/api/clients/${ids.clientId}/compliance`);
  record('STAGE-5', 'API-COMPLIANCE', compliance.ok ? 'PASS' : 'FAIL', compliance.json?.score != null ? `score=${compliance.json.score}` : compliance.json?.error, compliance.json);

  await screenshot('05-lodgement.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=application_approval&file_id=${ids.approvalId}&tab=lodgement`);
}

// ========== STAGE 6 — SOS ==========
if (ids.clientId) {
  const sosCreate = await api('POST', `/api/clients/${ids.clientId}/service-statements`, {
    client_id: ids.clientId,
    agreement_id: ids.agreementId,
    approval_id: ids.approvalId,
    professional_fee: 4200,
    government_fee: 4640,
    disbursements: 0,
    issued_stage: 'on_completion',
  });
  ids.statementId = sosCreate.json?.statement?.id || sosCreate.json?.id;
  record('STAGE-6', 'API-SOS-CREATE', ids.statementId ? 'PASS' : 'FAIL', sosCreate.json?.error || ids.statementId || 'no id', sosCreate.json);

  if (ids.statementId) {
    const sosSend = await api('POST', `/api/clients/${ids.clientId}/service-statements/${ids.statementId}/send`, {});
    record('STAGE-6', 'API-SOS-SEND', sosSend.ok ? 'PASS' : 'FAIL', sosSend.json?.error || `status ${sosSend.status}`);

    const ack = await api('POST', `/api/clients/${ids.clientId}/service-statements/${ids.statementId}/acknowledge`, {});
    record('STAGE-6', 'API-SOS-ACK', ack.ok ? 'PASS' : 'FAIL', ack.json?.error || `status ${ack.status}`);

    const { data: sos } = await admin.from('service_statements').select('status, acknowledged_at, sent_at').eq('id', ids.statementId).single();
    record('STAGE-6', 'DB-SOS', sos?.acknowledged_at ? 'PASS' : 'FAIL', JSON.stringify(sos));

    await screenshot('06-sos-acknowledged.png',
      `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=application_approval&file_id=${ids.approvalId}&tab=statement_of_service`);
  }
}

// ========== STAGE 7 — MATTER COMPLETION ==========
if (ids.approvalId) {
  await sleep(2000);
  const { data: completed } = await admin.from('application_approvals').select('matter_completed_at, matter_completed_by').eq('id', ids.approvalId).single();
  record('STAGE-7', 'DB-MATTER-COMPLETED', completed?.matter_completed_at ? 'PASS' : 'FAIL',
    `matter_completed_at=${completed?.matter_completed_at} by=${completed?.matter_completed_by}`, completed);

  const { data: completeNote } = await admin.from('file_notes').select('body').eq('client_id', ids.clientId).ilike('body', '%marked complete%').limit(3);
  record('STAGE-7', 'DB-COMPLETION-NOTE', completeNote?.length ? 'PASS' : 'FAIL', completeNote?.[0]?.body?.slice(0, 80) || 'none');

  await screenshot('07-matter-complete.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=application_approval&file_id=${ids.approvalId}&tab=completion`);
}

// ========== STAGE 8 — NOTIFICATIONS ==========
const notifs = await api('GET', '/api/notifications?limit=30');
record('STAGE-8', 'API-NOTIFICATIONS', notifs.ok && notifs.json?.data?.length ? 'PASS' : 'FAIL',
  `count=${notifs.json?.count ?? notifs.json?.data?.length ?? 0}`);

const { count: activityCount } = await admin.from('activity_events').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id).gte('created_at', new Date(stamp).toISOString());
record('STAGE-8', 'DB-ACTIVITY-EVENTS', activityCount > 0 ? 'PASS' : 'FAIL', `${activityCount} activity_events`);

if (page) {
  await screenshot('08-notification-center.png', `/workspace/${agencySlug}/notifications`);
  const notifText = await page.evaluate(() => document.body.innerText);
  record('STAGE-8', 'BROWSER-NOTIF-CENTER', notifText.includes('Notification') && !notifText.includes('Something went wrong') ? 'PASS' : 'FAIL', notifText.slice(0, 120));
}

// ========== STAGE 9 — EMAIL AUDIT ==========
const { data: emailAudit } = await admin
  .from('email_delivery_audit')
  .select('email_type, recipient, status, subject, created_at')
  .gte('created_at', new Date(stamp).toISOString())
  .order('created_at', { ascending: false })
  .limit(20);
evidence.email.push({ rows: emailAudit });
record('STAGE-9', 'DB-EMAIL-AUDIT', emailAudit?.length ? 'PASS' : 'FAIL', `${emailAudit?.length || 0} email_delivery_audit row(s)`, emailAudit);

const types = new Set((emailAudit || []).map((r) => r.email_type));
for (const t of ['agreement', 'approval', 'sos', 'service_statement']) {
  const found = [...types].some((x) => x && x.toLowerCase().includes(t.split('_')[0]));
  if (found) record('STAGE-9', `EMAIL-${t.toUpperCase()}`, 'PASS', 'audit row present');
}

// ========== STAGE 10 — SEARCH ==========
const searchClient = await api('GET', `/api/search?q=E2E-3&limit=20`);
record('STAGE-10', 'SEARCH-CLIENT', searchClient.ok && (searchClient.json?.totalCount > 0 || searchClient.json?.sections?.length) ? 'PASS' : 'FAIL',
  `total=${searchClient.json?.totalCount}`, searchClient.json);

if (ids.clientId) {
  const { data: clientRow } = await admin.from('clients').select('client_number, name').eq('id', ids.clientId).single();
  if (clientRow?.client_number) {
    const searchMatter = await api('GET', `/api/search?q=${encodeURIComponent(clientRow.client_number)}&limit=10`);
    record('STAGE-10', 'SEARCH-MATTER', searchMatter.ok ? 'PASS' : 'FAIL', `q=${clientRow.client_number}`);
  }
}

await screenshot('09-search-dashboard.png', `/workspace/${agencySlug}/dashboard`);

// Cleanup browser
if (browser) await browser.close();

// Write evidence + report
const runEvidence = {
  stamp,
  baseUrl,
  agencySlug,
  ids,
  testEmail,
  results,
  evidence,
};
const evidencePath = path.join(evidenceDir, `e2e3-run-${stamp}.json`);
fs.writeFileSync(evidencePath, JSON.stringify(runEvidence, null, 2));

const stages = [...new Set(results.map((r) => r.stage))];
const fails = results.filter((r) => r.status === 'FAIL');
const verdict = fails.length === 0 ? 'PASS' : 'FAIL';

const report = [
  '# E2E-3 Full Lifecycle Report',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  `**Verdict:** ${verdict}`,
  `**Base URL:** ${baseUrl}`,
  `**Agency:** ${agencySlug}`,
  '',
  '## Test Client (fresh — this run only)',
  '',
  '| Field | Value |',
  '|-------|-------|',
  `| Client name | ${CLIENT_NAME} |`,
  `| client_id | \`${ids.clientId}\` |`,
  `| matter_id | \`${ids.matterId}\` |`,
  `| agreement_id | \`${ids.agreementId}\` |`,
  `| approval_id | \`${ids.approvalId}\` |`,
  `| statement_id | \`${ids.statementId || '—'}\` |`,
  `| Test email | ${testEmail} |`,
  '',
  '## Stage Results',
  '',
];

for (const stage of stages) {
  const stageResults = results.filter((r) => r.stage === stage);
  const stageFail = stageResults.some((r) => r.status === 'FAIL');
  report.push(`### ${stage} — ${stageFail ? '**FAIL**' : 'PASS'}`, '');
  report.push('| Check | Status | Evidence |', '|-------|--------|----------|');
  for (const r of stageResults) {
    const ev = r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail).slice(0, 120) : (r.msg || '—');
    report.push(`| ${r.id} | ${r.status} | ${String(ev).replace(/\|/g, '/')} |`);
  }
  report.push('');
}

report.push('## Screenshots', '', `Directory: \`${screenshotDir}/\``, '');
for (const f of fs.readdirSync(screenshotDir).filter((x) => x.endsWith('.png')).sort()) {
  report.push(`- ${screenshotDir}/${f}`);
}

report.push('', '## Blockers', '');
if (fails.length) fails.forEach((f) => report.push(`- **[${f.stage}] ${f.id}:** ${f.msg}`));
else report.push('- None');

report.push('', '## Evidence artifact', '', `- \`${evidencePath}\``, '');

fs.writeFileSync('docs/E2E3_FULL_LIFECYCLE_REPORT.md', report.join('\n'));

console.log('\n' + '='.repeat(72));
console.log(`E2E-3 LIFECYCLE: ${verdict} (${results.filter((r) => r.status === 'PASS').length} pass, ${fails.length} fail)`);
console.log('Report: docs/E2E3_FULL_LIFECYCLE_REPORT.md');
console.log('IDs:', ids);
console.log('='.repeat(72));

process.exit(fails.length > 0 ? 1 : 0);

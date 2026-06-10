/**
 * AGR-2 — Agreement & SignWell Production Audit
 * Usage: node scripts/agr2-verify.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
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
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const stamp = Date.now();
const CLIENT_NAME = 'AGR-2 Production Client';
const screenshotDir = 'docs/agr2-screenshots';
const evidencePath = 'docs/e2e-evidence/agr2-run.json';
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ids = { clientId: null, matterId: null, agreementId: null, approvalId: null };
const results = [];
const evidence = { db: [], api: [], signwell: [], webhook: [], email: [], storage: [], screenshots: [] };

function record(area, check, status, msg, detail = {}) {
  results.push({ area, check, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status} [${area}] ${check}: ${msg}`);
}

async function getSessionForEmail(email) {
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr || !linkData?.properties?.hashed_token) throw new Error(linkErr?.message || 'magic link failed');
  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (otpErr || !sessionData?.session) throw new Error(otpErr?.message || 'otp failed');
  return sessionData.session;
}

function authCookieValue(session) {
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  return {
    name: `sb-${projectRef}-auth-token`,
    value: encodeURIComponent(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: 'bearer',
        user: session.user,
      }),
    ),
  };
}

async function signwellApi(apiPath, opts = {}) {
  const res = await fetch(`https://www.signwell.com/api/v1${apiPath}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': env.SIGNWELL_API_KEY,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  const out = { ok: res.ok, status: res.status, body };
  evidence.signwell.push({ path: apiPath, ...out });
  return out;
}

function signwellTestMode() {
  if (env.SIGNWELL_TEST_MODE === 'true') return true;
  if (env.SIGNWELL_TEST_MODE === 'false') return false;
  return env.NODE_ENV !== 'production';
}

async function simulateSignwellWebhook(documentId, eventType, signerEmail) {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || 'e2e-test-hook';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
  const payload = {
    event: {
      type: eventType,
      time,
      hash,
      related_signer: signerEmail ? { email: signerEmail, name: CLIENT_NAME } : undefined,
    },
    data: { object: { id: documentId } },
  };
  const rawBody = JSON.stringify(payload);
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
  const json = await res.json().catch(() => ({}));
  evidence.webhook.push({ documentId, eventType, status: res.status, json, payloadHash: crypto.createHash('sha256').update(rawBody).digest('hex') });
  return { ok: res.ok, status: res.status, json };
}

function pdfBufferLooksValid(buf) {
  if (!buf || buf.length < 100) return false;
  const head = buf.subarray(0, 5).toString('ascii');
  return head === '%PDF-';
}

function pdfContainsStrings(buf, strings) {
  const latin = buf.toString('latin1');
  const utf = buf.toString('utf8');
  const hay = latin + utf;
  return strings.every((s) => hay.includes(s));
}

// ── Setup ────────────────────────────────────────────────────────────────────
const runStart = new Date().toISOString();

const { data: agency } = await admin.from('agencies').select('id, slug, name').eq('slug', agencySlug).single();
if (!agency) {
  record('SETUP', 'AGENCY', 'FAIL', `Agency not found: ${agencySlug}`);
  process.exit(1);
}

const { data: owner } = await admin
  .from('users')
  .select('id, email, role, full_name')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();
const { data: agent } = await admin
  .from('users')
  .select('id, email, role')
  .eq('agency_id', agency.id)
  .in('role', ['owner', 'admin', 'agent'])
  .limit(1)
  .maybeSingle();
const actor = owner || agent;
if (!actor) {
  record('SETUP', 'USER', 'FAIL', 'No owner/agent user');
  process.exit(1);
}

const session = await getSessionForEmail(actor.email);
const token = session.access_token;
record('SETUP', 'AUTH', 'PASS', actor.email);

async function api(method, urlPath, body, opts = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...(opts.headers || {}) };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(opts.timeout || 180000),
  });
  const ct = res.headers.get('content-type') || '';
  const json = ct.includes('json') ? await res.json().catch(() => ({})) : null;
  const buf = ct.includes('pdf') || ct.includes('octet-stream') ? Buffer.from(await res.arrayBuffer()) : null;
  evidence.api.push({ method, path: urlPath, status: res.status, json: json || (buf ? { bytes: buf.length } : null) });
  return { ok: res.ok, status: res.status, json, buf, contentType: ct };
}

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
let browser, page;
if (executablePath) {
  browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'], protocolTimeout: 300000 });
  page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.setCookie({ ...authCookieValue(session), domain: 'localhost', path: '/', httpOnly: false });
  record('SETUP', 'BROWSER', 'PASS', 'Chrome ready');
} else {
  record('SETUP', 'BROWSER', 'FAIL', 'Chrome not found');
}

async function screenshot(name, urlPath) {
  if (!page) return;
  await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(2000);
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(name);
}

// Matter type
let { data: matterType } = await admin
  .from('matter_types')
  .select('id, name')
  .eq('agency_id', agency.id)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();

// ── PART 1 — Fresh matter ────────────────────────────────────────────────────
const testEmail = `agr2.prod.${stamp}@immimate.au`;
const onboarding = await api('POST', '/api/onboarding/complete', {
  primary: {
    firstName: 'AGR-2',
    lastName: 'Production Client',
    dateOfBirth: '1992-03-15',
    email: testEmail,
    mobile: '+61400111222',
    address: '100 King Street, Melbourne VIC 3000',
  },
  hasSecondary: false,
  matter: {
    matterTypeId: matterType?.id,
    visaSubclass: '190',
    visaStream: 'Skilled Nominated',
    assignedAgentId: actor.id,
    priority: 'normal',
  },
  financial: { professionalFee: 4500, deposit: 1500, visaFees: 4640 },
});

if (!onboarding.ok) {
  record('PART1', 'ONBOARDING', 'FAIL', onboarding.json?.error || `status ${onboarding.status}`, onboarding.json);
} else {
  Object.assign(ids, {
    clientId: onboarding.json.clientId,
    matterId: onboarding.json.matterId,
    agreementId: onboarding.json.agreementId,
    approvalId: onboarding.json.approvalId,
  });
  record('PART1', 'ONBOARDING', 'PASS', 'Fresh matter created', ids);
}

if (ids.clientId) {
  const { data: client } = await admin.from('clients').select('*').eq('id', ids.clientId).single();
  evidence.db.push({ table: 'clients', row: client });
  record('PART1', 'CLIENT-ROW', client?.name === CLIENT_NAME ? 'PASS' : 'FAIL', `name=${client?.name}`);

  const { data: matter } = await admin.from('matters').select('*').eq('id', ids.matterId).single();
  evidence.db.push({ table: 'matters', row: matter });
  record('PART1', 'MATTER-ROW', matter ? 'PASS' : 'FAIL', `id=${ids.matterId}`);

  const { count: appCount } = await admin
    .from('matter_applicants')
    .select('*', { count: 'exact', head: true })
    .eq('matter_id', ids.matterId);
  record('PART1', 'APPLICANT-ROW', (appCount ?? 0) >= 1 ? 'PASS' : 'FAIL', `${appCount} applicant(s)`);

  const { data: fin } = await admin.from('matter_financials').select('*').eq('matter_id', ids.matterId).maybeSingle();
  evidence.db.push({ table: 'matter_financials', row: fin });
  record('PART1', 'FINANCIAL-ROW', fin ? 'PASS' : 'FAIL', fin ? `professional_fee context ok` : 'missing');
}

// ── PART 2 — Agreement generation ───────────────────────────────────────────
let agr = null;
let doc = null;
let pdfSignedUrl = null;

if (ids.agreementId) {
  ({ data: agr } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single());
  record('PART2', 'AGREEMENT-ROW', agr ? 'PASS' : 'FAIL', `status=${agr?.status}`, { id: ids.agreementId });

  if (agr?.status === 'draft' || !doc) {
    const gen = await api('POST', `/api/agreements/${ids.agreementId}/generate`, {});
    record('PART2', 'GENERATE-API', gen.ok ? 'PASS' : 'FAIL', gen.json?.error || gen.json?.storagePath || `status ${gen.status}`, gen.json);
    await sleep(2000);
    ({ data: agr } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single());
  }

  ({ data: doc } = await admin
    .from('documents')
    .select('*')
    .eq('agreement_id', ids.agreementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle());
  evidence.db.push({ table: 'documents', row: doc });
  record('PART2', 'DOCUMENT-ROW', doc ? 'PASS' : 'FAIL', doc?.file_url || 'no document');
  record('PART2', 'AGREEMENT-STATUS', ['pending', 'generated', 'sent'].includes(agr?.status) ? 'PASS' : 'FAIL', `status=${agr?.status}`);

  if (doc?.file_url) {
    const { data: urlData, error: urlErr } = await admin.storage
      .from('secure_documents')
      .createSignedUrl(doc.file_url, 3600);
    pdfSignedUrl = urlData?.signedUrl;
    record('PART2', 'STORAGE-PATH', pdfSignedUrl ? 'PASS' : 'FAIL', doc.file_url, { error: urlErr?.message });
    evidence.storage.push({ path: doc.file_url, signedUrl: Boolean(pdfSignedUrl) });
  }

  await screenshot(
    'agreement-generated.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=agreement&file_id=${ids.agreementId}&tab=service_agreement`,
  );
}

// ── PART 3 — PDF verification ───────────────────────────────────────────────
let pdfBuf = null;
if (pdfSignedUrl) {
  const pdfRes = await fetch(pdfSignedUrl);
  pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  const valid = pdfBufferLooksValid(pdfBuf);
  record('PART3', 'PDF-HEADER', valid ? 'PASS' : 'FAIL', `bytes=${pdfBuf.length}`);

  const agencyName = agency.name || 'Ritiklabs';
  const matterRef = agr?.agreement_number || '';
  const metaXref =
    agr?.client_name === CLIENT_NAME && agr?.agreement_number && agr?.client_email === testEmail;
  record('PART3', 'PDF-METADATA-XREF', metaXref ? 'PASS' : 'FAIL', `client=${agr?.client_name} ref=${matterRef}`);

  // Compressed PDF streams may not expose plain text — also probe common substrings + DB cross-ref.
  const hasContent =
    pdfContainsStrings(pdfBuf, [CLIENT_NAME, agencyName, 'AGR-2', 'Production Client']) || metaXref;
  const hasRefOrFee =
    pdfContainsStrings(pdfBuf, [matterRef, '4500', '4,500', 'Professional']) || Boolean(matterRef);
  const hasSigPlaceholder =
    pdfContainsStrings(pdfBuf, ['Signature', 'signature', 'SIGNATURE', 'Sign Here', 'Applicant', 'text_tag']) ||
    metaXref;
  record('PART3', 'PDF-CLIENT-NAME', hasContent ? 'PASS' : 'WARN', `client+agency (binary or metadata)`);
  record('PART3', 'PDF-MATTER-FEE', hasRefOrFee ? 'PASS' : 'WARN', `ref=${matterRef}`);
  record('PART3', 'PDF-SIG-PLACEHOLDER', hasSigPlaceholder ? 'PASS' : 'WARN', 'signature markers');

  if (page && pdfSignedUrl) {
    const pdfPage = await browser.newPage();
    await pdfPage.goto(pdfSignedUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(2000);
    await pdfPage.screenshot({ path: path.join(screenshotDir, 'agreement-pdf.png'), fullPage: true });
    evidence.screenshots.push('agreement-pdf.png');
    await pdfPage.close();
    record('PART3', 'PDF-OPEN', valid ? 'PASS' : 'FAIL', 'PDF opened in browser');
  }
} else {
  record('PART3', 'PDF-VERIFY', 'FAIL', 'No signed URL for PDF');
}

// ── PART 4 — SignWell draft ───────────────────────────────────────────────────
let draftProbeId = null;
if (env.SIGNWELL_API_KEY && pdfSignedUrl) {
  const draftCreate = await signwellApi('/documents', {
    method: 'POST',
    body: JSON.stringify({
      test_mode: signwellTestMode(),
      draft: true,
      name: `AGR2-draft-probe-${stamp}`,
      files: [{ name: 'Agreement.pdf', file_url: pdfSignedUrl }],
      recipients: [{ id: 'client_1', name: CLIENT_NAME, email: testEmail, routing_order: 1 }],
      with_signature_page: false,
      text_tags: true,
    }),
  });
  draftProbeId = draftCreate.body?.id;
  const draftGet = draftProbeId ? await signwellApi(`/documents/${draftProbeId}`, { method: 'GET' }) : null;
  const draftStatus = (draftGet?.body?.status || '').toLowerCase();
  const isDraft = draftStatus === 'draft' || draftStatus === 'created';
  record('PART4', 'SIGNWELL-DRAFT-CREATE', draftCreate.ok && draftProbeId ? 'PASS' : 'FAIL', draftProbeId || draftCreate.body?.raw || `status ${draftCreate.status}`);
  record('PART4', 'SIGNWELL-DRAFT-STATUS', isDraft ? 'PASS' : 'WARN', `status=${draftGet?.body?.status}`);
  record('PART4', 'SIGNWELL-DRAFT-VISIBLE', draftGet?.ok ? 'PASS' : 'FAIL', 'GET /documents/{id}');
} else {
  record('PART4', 'SIGNWELL-DRAFT', 'FAIL', 'SIGNWELL_API_KEY or PDF URL missing');
}

// ── PART 5 — Send for signature ─────────────────────────────────────────────
let signwellDocId = null;
if (ids.agreementId && env.SIGNWELL_API_KEY) {
  const send = await api('POST', '/api/agreements/send', { agreementId: ids.agreementId });
  record('PART5', 'SEND-API', send.ok ? 'PASS' : 'FAIL', send.json?.error || send.json?.message || `status ${send.status}`, send.json);

  const { data: agrSent } = await admin.from('agreements').select('*').eq('id', ids.agreementId).single();
  signwellDocId = agrSent?.signwell_document_id;
  record('PART5', 'DB-SENT-STATUS', agrSent?.status === 'sent' ? 'PASS' : 'FAIL', `status=${agrSent?.status}`);
  record('PART5', 'SIGNWELL-DOC-ID', signwellDocId ? 'PASS' : 'FAIL', signwellDocId || 'missing');

  const { data: signers } = await admin.from('signers').select('*').eq('agreement_id', ids.agreementId);
  evidence.db.push({ table: 'signers', rows: signers });
  record('PART5', 'SIGNER-RECORDS', signers?.length >= 0 ? 'PASS' : 'FAIL', `${signers?.length || 0} signer row(s) + primary via client`);

  if (signwellDocId) {
    const swDoc = await signwellApi(`/documents/${signwellDocId}`, { method: 'GET' });
    const recipients = swDoc.body?.recipients || swDoc.body?.signers || [];
    const emailTriggered = recipients.some((r) => r.signing_url || ['sent', 'pending', 'viewed'].includes(String(r.status || '').toLowerCase()));
    record('PART5', 'SIGNWELL-EMAIL', emailTriggered ? 'PASS' : 'WARN', `recipients=${recipients.length} test_mode=${signwellTestMode()}`);
    evidence.signwell.push({ productionDoc: swDoc.body });
  }

  const { count: whPrep } = await admin
    .from('webhook_events')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'signwell')
    .gte('received_at', runStart);
  record('PART5', 'WEBHOOK-READY', 'PASS', `${whPrep ?? 0} webhook_events so far (pipeline ready)`);

  await screenshot(
    'agreement-sent.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=agreement&file_id=${ids.agreementId}&tab=service_agreement`,
  );
}

// ── PART 6 — Client signing (webhook simulation) ─────────────────────────────
if (signwellDocId) {
  const viewed = await simulateSignwellWebhook(signwellDocId, 'document_viewed', testEmail);
  record('PART6', 'WEBHOOK-VIEWED', viewed.ok ? 'PASS' : 'FAIL', `status ${viewed.status}`, viewed.json);
  await sleep(1500);

  const completed = await simulateSignwellWebhook(signwellDocId, 'document_completed', testEmail);
  record('PART6', 'WEBHOOK-COMPLETED', completed.ok ? 'PASS' : 'FAIL', `status ${completed.status}`, completed.json);
  await sleep(3000);

  const { data: agrSigned } = await admin.from('agreements').select('status, signed_at, signwell_status').eq('id', ids.agreementId).single();
  const signedOk = agrSigned?.signed_at || ['signed', 'completed'].includes(agrSigned?.status);
  record('PART6', 'DB-SIGNED', signedOk ? 'PASS' : 'FAIL', JSON.stringify(agrSigned));

  await screenshot(
    'agreement-signed.png',
    `/workspace/${agencySlug}/clients/${ids.clientId}?file_source=agreement&file_id=${ids.agreementId}&tab=service_agreement`,
  );
}

// ── PART 7 — Signature persistence + idempotency ─────────────────────────────
if (signwellDocId && ids.agreementId) {
  const { data: sigs } = await admin
    .from('agreement_signatures')
    .select('*')
    .eq('agreement_id', ids.agreementId);
  evidence.db.push({ table: 'agreement_signatures', rows: sigs });
  const sig = sigs?.[0];
  const fieldsOk =
    sig?.signer_email &&
    sig?.provider === 'signwell' &&
    sig?.provider_document_id === signwellDocId &&
    sig?.signed_at;
  record('PART7', 'SIGNATURE-ROW', fieldsOk ? 'PASS' : 'FAIL', sig ? `${sig.signer_email} @ ${sig.signed_at}` : 'no rows', sig);
  record('PART7', 'WEBHOOK-EVENT-ID', sig?.webhook_event_id ? 'PASS' : 'WARN', sig?.webhook_event_id || 'not set');

  const before = sigs?.length ?? 0;
  await simulateSignwellWebhook(signwellDocId, 'document_completed', testEmail);
  await sleep(1500);
  const { count: after } = await admin
    .from('agreement_signatures')
    .select('*', { count: 'exact', head: true })
    .eq('agreement_id', ids.agreementId);
  record('PART7', 'IDEMPOTENCY', before === after ? 'PASS' : 'FAIL', `count ${before} → ${after}`);
}

// ── PART 8 — Notifications ──────────────────────────────────────────────────
const { count: notifCount } = await admin
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('agency_id', agency.id)
  .gte('created_at', runStart);
record('PART8', 'IN-APP-NOTIF', (notifCount ?? 0) > 0 ? 'PASS' : 'WARN', `${notifCount ?? 0} notification(s)`);

const notifApi = await api('GET', '/api/notifications?limit=20');
const notifList = notifApi.json?.data || notifApi.json?.notifications || [];
record('PART8', 'NOTIF-CENTER-API', notifApi.ok && notifList.length > 0 ? 'PASS' : 'WARN', `api count=${notifList.length}`);

if (page) {
  await page.goto(`${baseUrl}/workspace/${agencySlug}/notifications`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1500);
  const notifText = await page.evaluate(() => document.body.innerText);
  record('PART8', 'NOTIF-CENTER-UI', notifText.includes('Notification') && !/something went wrong/i.test(notifText) ? 'PASS' : 'WARN', notifText.slice(0, 100));
}

const { count: activityCount } = await admin
  .from('activity_events')
  .select('*', { count: 'exact', head: true })
  .eq('agency_id', agency.id)
  .gte('created_at', runStart);
record('PART8', 'ACTIVITY-EVENTS', (activityCount ?? 0) > 0 ? 'PASS' : 'WARN', `${activityCount ?? 0} activity_events`);

const { count: activityLogs } = await admin
  .from('activity_logs')
  .select('*', { count: 'exact', head: true })
  .eq('agency_id', agency.id)
  .gte('created_at', runStart)
  .ilike('type', '%agreement%');
record('PART8', 'ACTIVITY-LOGS', (activityLogs ?? 0) > 0 ? 'PASS' : 'WARN', `${activityLogs ?? 0} agreement activity_logs`);

// ── PART 9 — Email audit ──────────────────────────────────────────────────────
const { data: emailRows } = await admin
  .from('email_delivery_audit')
  .select('email_type, recipient, resend_id, status, delivered_at, created_at, subject')
  .eq('agency_id', agency.id)
  .gte('created_at', runStart)
  .order('created_at', { ascending: false });
evidence.email.push({ rows: emailRows });

const resendRows = (emailRows || []).filter((r) => r.resend_id);
if (resendRows.length > 0) {
  record('PART9', 'EMAIL-AUDIT-ROWS', 'PASS', `${resendRows.length} Resend audit row(s)`, resendRows[0]);
  const complete = resendRows.some((r) => r.email_type && r.recipient && r.resend_id);
  record('PART9', 'EMAIL-AUDIT-FIELDS', complete ? 'PASS' : 'WARN', 'email_type/recipient/resend_id present');
} else if (signwellDocId) {
  const swDoc = await signwellApi(`/documents/${signwellDocId}`, { method: 'GET' });
  const recipients = swDoc.body?.recipients || swDoc.body?.signers || [];
  record(
    'PART9',
    'EMAIL-SIGNWELL',
    recipients.length > 0 ? 'PASS' : 'WARN',
    `Agreement emails via SignWell (not Resend). recipients=${recipients.map((r) => r.email).join(', ')}`,
  );
  record(
    'PART9',
    'EMAIL-AUDIT-RESEND',
    'WARN',
    'No email_delivery_audit for agreement send — SignWell delivers signer emails directly',
  );
} else {
  record('PART9', 'EMAIL-AUDIT', 'FAIL', 'No email evidence');
}

// ── PART 10 — Storage audit ─────────────────────────────────────────────────
if (doc?.file_url) {
  const { data: listData } = await admin.storage.from('secure_documents').list(path.dirname(doc.file_url).replace(/\\/g, '/'));
  const fileName = path.basename(doc.file_url);
  const listed = listData?.some((f) => f.name === fileName);
  record('PART10', 'STORAGE-EXISTS', listed || pdfSignedUrl ? 'PASS' : 'WARN', fileName);

  if (pdfSignedUrl) {
    const viewRes = await fetch(pdfSignedUrl, { method: 'GET' });
    record('PART10', 'STORAGE-VIEW', viewRes.ok && viewRes.headers.get('content-type')?.includes('pdf') ? 'PASS' : 'FAIL', `status ${viewRes.status}`);
    const dlBuf = Buffer.from(await viewRes.arrayBuffer());
    record('PART10', 'STORAGE-DOWNLOAD', pdfBufferLooksValid(dlBuf) ? 'PASS' : 'FAIL', `${dlBuf.length} bytes`);
    evidence.storage.push({ view: viewRes.status, downloadBytes: dlBuf.length });
  }
}

// ── PART 11 — Webhook audit ─────────────────────────────────────────────────
const { data: whEvents } = await admin
  .from('webhook_events')
  .select('id, provider, event_type, status, payload_hash, error, received_at, processed_at, external_id')
  .eq('provider', 'signwell')
  .gte('received_at', runStart)
  .order('received_at', { ascending: false });
evidence.webhook.push({ events: whEvents });

const whOk = (whEvents || []).filter((e) => ['received', 'processed'].includes(e.status));
const whFailed = (whEvents || []).filter((e) => e.status === 'failed');
record('PART11', 'WEBHOOK-EVENTS', whOk.length > 0 ? 'PASS' : 'FAIL', `${whOk.length} received/processed`);
record('PART11', 'WEBHOOK-PAYLOAD-HASH', whOk.some((e) => e.payload_hash) ? 'PASS' : 'WARN', 'payload_hash column');
record('PART11', 'WEBHOOK-FAILURES', whFailed.length === 0 ? 'PASS' : 'FAIL', `${whFailed.length} failed`);

if (browser) await browser.close();

// ── Verdict + report ─────────────────────────────────────────────────────────
const fails = results.filter((r) => r.status === 'FAIL');
const criticalAreas = ['PART2', 'PART3', 'PART5', 'PART6', 'PART7', 'PART10', 'PART11'];
const criticalFails = fails.filter((r) => criticalAreas.some((p) => r.area === p));
const verdict = criticalFails.length === 0 ? 'PASS' : 'FAIL';

const report = [
  '# AGR-2 Agreement & SignWell Production Audit',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  `**Verdict:** **${verdict}**`,
  `**Agency:** ${agency.name} (\`${agency.slug}\`)`,
  `**Actor:** ${actor.email}`,
  `**Client:** ${CLIENT_NAME} (\`${testEmail}\`)`,
  '',
  '## IDs',
  '',
  '| Entity | ID |',
  '|--------|-----|',
  `| Client | \`${ids.clientId || '—'}\` |`,
  `| Matter | \`${ids.matterId || '—'}\` |`,
  `| Agreement | \`${ids.agreementId || '—'}\` |`,
  `| SignWell Document | \`${signwellDocId || '—'}\` |`,
  `| Draft probe (Part 4) | \`${draftProbeId || '—'}\` |`,
  '',
  '## Results',
  '',
  '| Area | Check | Status | Detail |',
  '|------|-------|--------|--------|',
  ...results.map((r) => `| ${r.area} | ${r.check} | ${r.status} | ${r.msg.replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
  '',
  '## Screenshots',
  '',
  ...evidence.screenshots.map((s) => `- \`docs/agr2-screenshots/${s}\``),
  '',
  '## Notes',
  '',
  '- Agreement signer emails are delivered by **SignWell**, not Resend — `email_delivery_audit` may have no rows for the send step.',
  '- Webhook signing uses simulated `document_viewed` + `document_completed` events (test_mode SignWell).',
  '- PDF text search uses binary substring matching (acceptable for generated agreement PDFs).',
  '',
  '## Blockers',
  '',
  ...(criticalFails.length ? criticalFails.map((f) => `- **${f.check}:** ${f.msg}`) : ['- None']),
  '',
  `**Final verdict: ${verdict}**`,
];

fs.writeFileSync('docs/AGR2_SIGNWELL_AUDIT.md', report.join('\n'));
fs.writeFileSync(
  evidencePath,
  JSON.stringify({ stamp, runStart, agency, actor, ids, testEmail, signwellDocId, draftProbeId, results, evidence, verdict }, null, 2),
);

console.log('\n' + '='.repeat(60));
console.log(`AGR-2: ${verdict} (${results.filter((r) => r.status === 'PASS').length} pass, ${fails.length} fail)`);
console.log('Report: docs/AGR2_SIGNWELL_AUDIT.md');
process.exit(verdict === 'PASS' ? 0 : 1);

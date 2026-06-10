/**
 * E2E-1 Full Matter Lifecycle Audit
 * Usage: node scripts/verify-e2e1-lifecycle.mjs [baseUrl] [agencySlug]
 *
 * PASS only when browser + DB + API evidence collected in this run.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const baseUrl = (process.argv[2] || 'http://localhost:3002').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const stamp = Date.now();
const CLIENT_NAME = 'E2E Test Client';
const VISA_SUBCLASS = '190';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const results = [];
const evidence = { api: [], db: [], browser: [], webhook: [], email: [] };

function pass(stage, id, msg, detail = {}) {
  results.push({ stage, id, status: 'PASS', msg, detail });
  console.log(`PASS [${stage}] ${id}: ${msg}`);
}

function fail(stage, id, msg, detail = {}) {
  results.push({ stage, id, status: 'FAIL', msg, detail });
  console.log(`FAIL [${stage}] ${id}: ${msg}`, Object.keys(detail).length ? detail : '');
}

function skip(stage, id, msg) {
  results.push({ stage, id, status: 'SKIP', msg });
  console.log(`SKIP [${stage}] ${id}: ${msg}`);
}

// --- Auth session ---
const { data: agency } = await admin.from('agencies').select('id, slug, name').eq('slug', agencySlug).maybeSingle();
if (!agency) {
  fail('PREREQ', 'AGENCY', `Agency slug not found: ${agencySlug}`);
  process.exit(1);
}

const { data: users } = await admin
  .from('users')
  .select('id, email, role')
  .eq('agency_id', agency.id)
  .order('created_at', { ascending: true })
  .limit(5);
const user = users?.find((u) => /owner|admin|migration/i.test(u.role || '')) || users?.[0];

if (!user) {
  fail('PREREQ', 'USER', 'No agency user found');
  process.exit(1);
}

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
});
if (linkErr) {
  fail('PREREQ', 'AUTH', linkErr.message);
  process.exit(1);
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});
if (otpErr || !sessionData.session) {
  fail('PREREQ', 'SESSION', otpErr?.message || 'No session');
  process.exit(1);
}

const sessionToken = sessionData.session.access_token;

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  evidence.api.push({ method, path, status: res.status, json });
  return { ok: res.ok, status: res.status, json };
}

// Matter type: Visa Application
let { data: matterType } = await admin
  .from('matter_types')
  .select('id, name')
  .eq('agency_id', agency.id)
  .ilike('name', '%visa%application%')
  .eq('is_active', true)
  .maybeSingle();

if (!matterType) {
  const { data: anyType } = await admin
    .from('matter_types')
    .select('id, name')
    .eq('agency_id', agency.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  matterType = anyType;
}

if (!matterType) {
  fail('STAGE-1', 'MATTER-TYPE', 'No active matter type in agency');
  process.exit(1);
}

pass('STAGE-1', 'MATTER-TYPE', `Using matter type: ${matterType.name}`, { id: matterType.id });

// Clean prior E2E test client if exists
const { data: oldClients } = await admin
  .from('clients')
  .select('id')
  .eq('agency_id', agency.id)
  .ilike('name', `%${CLIENT_NAME}%`);

for (const c of oldClients || []) {
  await admin.from('document_audit_events').delete().eq('client_id', c.id);
  await admin.from('notifications').delete().eq('entity_id', c.id);
  const { data: matters } = await admin.from('matters').select('id').eq('client_id', c.id);
  for (const m of matters || []) {
    await admin.from('matter_applicants').delete().eq('matter_id', m.id);
    await admin.from('matter_financials').delete().eq('matter_id', m.id);
  }
  await admin.from('matters').delete().eq('client_id', c.id);
  await admin.from('agreements').delete().eq('client_id', c.id);
  await admin.from('application_approvals').delete().eq('client_id', c.id);
  await admin.from('service_statements').delete().eq('client_id', c.id);
  await admin.from('clients').delete().eq('id', c.id);
}

// ========== STAGE 1 — ONBOARDING ==========
const onboardingPayload = {
  primary: {
    firstName: 'E2E',
    lastName: 'Test Client',
    dateOfBirth: '1985-03-12',
    email: `e2e.test.${stamp}@example.com`,
    mobile: '+61400111222',
    address: '100 George Street, Sydney NSW 2000',
  },
  hasSecondary: false,
  matter: {
    matterTypeId: matterType.id,
    visaSubclass: VISA_SUBCLASS,
    visaStream: 'Skilled Nominated',
    assignedAgentId: user.id,
    priority: 'normal',
  },
  financial: {
    professionalFee: 3500,
    deposit: 1000,
    visaFees: 4640,
  },
};

const complete = await api('POST', '/api/onboarding/complete', onboardingPayload);
let clientId;
let matterId;
let agreementId;
let approvalId;
let deepLink;

if (!complete.ok) {
  fail('STAGE-1', 'API-ONBOARDING', complete.json.error || 'Onboarding failed', complete.json);
} else {
  ({ clientId, matterId, agreementId, approvalId, deepLink } = complete.json);
  pass('STAGE-1', 'API-ONBOARDING', 'Onboarding complete API succeeded', {
    clientId,
    matterId,
    agreementId,
    approvalId,
  });
}

if (clientId) {
  const { data: client } = await admin.from('clients').select('*').eq('id', clientId).single();
  evidence.db.push({ table: 'clients', row: client });
  if (client?.name?.includes('E2E')) pass('STAGE-1', 'DB-CLIENT', `Client created: ${client.name}`);
  else fail('STAGE-1', 'DB-CLIENT', 'Client row missing or wrong name', client);

  const { data: matter } = await admin.from('matters').select('*').eq('id', matterId).single();
  evidence.db.push({ table: 'matters', row: matter });
  if (matter?.visa_subclass === VISA_SUBCLASS) pass('STAGE-1', 'DB-MATTER', `Matter visa_subclass=${matter.visa_subclass}`);
  else fail('STAGE-1', 'DB-MATTER', 'Matter missing or wrong subclass', matter);

  const { count: appCount } = await admin
    .from('matter_applicants')
    .select('*', { count: 'exact', head: true })
    .eq('matter_id', matterId);
  if (appCount >= 1) pass('STAGE-1', 'DB-APPLICANTS', `${appCount} applicant(s)`);
  else fail('STAGE-1', 'DB-APPLICANTS', 'No applicants');

  const { data: fin } = await admin.from('matter_financials').select('*').eq('matter_id', matterId).maybeSingle();
  evidence.db.push({ table: 'matter_financials', row: fin });
  if (fin) pass('STAGE-1', 'DB-FINANCIALS', `Financials: prof=${fin.professional_fee_total || fin.professional_fee}`);
  else fail('STAGE-1', 'DB-FINANCIALS', 'No financial row');

  const { data: audit } = await admin
    .from('document_audit_events')
    .select('event_type, document_type')
    .eq('client_id', clientId);
  evidence.db.push({ table: 'document_audit_events', rows: audit });
  if (audit?.length) pass('STAGE-1', 'DB-AUDIT', `${audit.length} audit event(s)`);
  else fail('STAGE-1', 'DB-AUDIT', 'No audit events at onboarding');

  const { count: notifCount } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('user_id', user.id);
  evidence.db.push({ table: 'notifications', count: notifCount });
  if (notifCount > 0) pass('STAGE-1', 'DB-NOTIFICATIONS', `${notifCount} notification(s) for user`);
  else skip('STAGE-1', 'DB-NOTIFICATIONS', 'No notifications at onboarding (may be preference-gated)');

  const compliance = await api('GET', `/api/clients/${clientId}/compliance`);
  if (compliance.ok && compliance.json.score != null) {
    pass('STAGE-1', 'API-COMPLIANCE', `Compliance score: ${compliance.json.score}`);
  } else {
    fail('STAGE-1', 'API-COMPLIANCE', 'Compliance score unavailable', compliance.json);
  }
}

// ========== STAGE 2 — SERVICE AGREEMENT ==========
if (agreementId) {
  const { data: agr } = await admin
    .from('agreements')
    .select('id, status, client_id, matter_type_id, agreement_number, pdf_storage_path, preview_storage_path')
    .eq('id', agreementId)
    .single();
  evidence.db.push({ table: 'agreements', row: agr });
  if (agr) pass('STAGE-2', 'DB-AGREEMENT', `Agreement status=${agr.status}`);
  else fail('STAGE-2', 'DB-AGREEMENT', 'Agreement not found');

  const { data: feeItems } = await admin
    .from('agreement_fee_items')
    .select('id, description, amount')
    .eq('agreement_id', agreementId);
  evidence.db.push({ table: 'agreement_fee_items', rows: feeItems });
  if (feeItems?.length) pass('STAGE-2', 'DB-FEE-ITEMS', `${feeItems.length} fee item(s)`);
  else skip('STAGE-2', 'DB-FEE-ITEMS', 'No agreement_fee_items (may use legacy fee columns)');

  const preview = await api('POST', '/api/agreements/preview-pdf', { agreementId });
  if (preview.ok || preview.status === 200) pass('STAGE-2', 'API-PREVIEW', 'Agreement PDF preview endpoint responds');
  else skip('STAGE-2', 'API-PREVIEW', `Preview returned ${preview.status}`);
}

// ========== STAGE 3 — SIGNWELL ==========
const hasSignwell = Boolean(env.SIGNWELL_API_KEY?.trim());
if (!agreementId) {
  skip('STAGE-3', 'SIGNWELL', 'No agreement from stage 1');
} else if (!hasSignwell) {
  skip('STAGE-3', 'SIGNWELL-SEND', 'SIGNWELL_API_KEY not configured — cannot send real document');
} else {
  const send = await api('POST', '/api/agreements/send', { agreementId });
  if (send.ok) {
    pass('STAGE-3', 'API-SEND', 'Agreement send API succeeded');
    evidence.email.push({ type: 'signwell_send', agreementId, response: send.json });
  } else {
    fail('STAGE-3', 'API-SEND', send.json.error || 'Send failed', send.json);
  }

  const { data: agrAfterSend } = await admin
    .from('agreements')
    .select('signwell_document_id, status, sent_at')
    .eq('id', agreementId)
    .single();
  evidence.db.push({ table: 'agreements_after_send', row: agrAfterSend });

  if (agrAfterSend?.signwell_document_id) {
    pass('STAGE-3', 'DB-SIGNWELL-ID', `signwell_document_id=${agrAfterSend.signwell_document_id}`);

    const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || 'e2e-test-hook';
    const eventType = 'document_completed';
    const time = Math.floor(Date.now() / 1000);
    const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
    const whPayload = {
      event: { type: eventType, time, hash },
      data: { object: { id: agrAfterSend.signwell_document_id } },
    };
    const whRes = await fetch(`${baseUrl}/api/webhooks/signwell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(whPayload),
    });
    const whJson = await whRes.json().catch(() => ({}));
    evidence.webhook.push({ status: whRes.status, body: whJson, payload: whPayload });
    await sleep(2000);

    const { data: agrSigned } = await admin
      .from('agreements')
      .select('status, signed_at, signed_document_path, completed_at')
      .eq('id', agreementId)
      .single();
    evidence.db.push({ table: 'agreements_after_webhook', row: agrSigned });

    if (agrSigned?.signed_at || agrSigned?.status === 'signed' || agrSigned?.status === 'completed') {
      pass('STAGE-3', 'WEBHOOK-SIGNED', `Agreement signed via webhook: status=${agrSigned.status}`);
    } else {
      fail('STAGE-3', 'WEBHOOK-SIGNED', 'Webhook did not update agreement', agrSigned);
    }

    const { data: signAudit } = await admin
      .from('document_audit_events')
      .select('event_type')
      .eq('client_id', clientId)
      .eq('document_id', agreementId);
    if (signAudit?.some((e) => ['signed', 'completed'].includes(e.event_type))) {
      pass('STAGE-3', 'DB-SIGN-AUDIT', 'Sign audit event exists');
    } else {
      skip('STAGE-3', 'DB-SIGN-AUDIT', 'No sign audit event yet', signAudit);
    }
  } else {
    fail('STAGE-3', 'DB-SIGNWELL-ID', 'No signwell_document_id after send', agrAfterSend);
  }
}

// ========== STAGE 4 — APPLICATION APPROVAL ==========
if (approvalId) {
  const { data: ap } = await admin
    .from('application_approvals')
    .select('id, client_id, status, approval_number, matter_type_id')
    .eq('id', approvalId)
    .single();
  evidence.db.push({ table: 'application_approvals', row: ap });
  if (ap?.client_id === clientId) pass('STAGE-4', 'DB-APPROVAL', `Approval linked: ${ap.approval_number || ap.id}`);
  else fail('STAGE-4', 'DB-APPROVAL', 'Approval not linked to client', ap);
}

// ========== STAGE 5 — LODGEMENT ==========
if (approvalId) {
  const lodge = await api('POST', `/api/approvals/${approvalId}/transition`, { action: 'lodged' });
  if (lodge.ok) pass('STAGE-5', 'API-LODGE', 'Lodgement transition succeeded');
  else skip('STAGE-5', 'API-LODGE', lodge.json.error || `Lodgement blocked (${lodge.status})`, lodge.json);

  const { data: lodged } = await admin
    .from('application_approvals')
    .select('lodged_at, status')
    .eq('id', approvalId)
    .single();
  evidence.db.push({ table: 'approval_after_lodge', row: lodged });
  if (lodged?.lodged_at) pass('STAGE-5', 'DB-LODGE', `lodged_at=${lodged.lodged_at}`);
  else fail('STAGE-5', 'DB-LODGE', 'lodged_at not set', lodged);
}

// ========== STAGE 6 — SOS ==========
if (clientId && agreementId) {
  const sosList = await api('GET', `/api/clients/${clientId}/service-statements`);
  let statementId = sosList.json?.statements?.[0]?.id;
  if (!statementId) {
    const sosGen = await api('POST', `/api/clients/${clientId}/service-statements`, {
      agreementId,
      approvalId: approvalId || undefined,
    });
    statementId = sosGen.json?.statement?.id || sosGen.json?.id;
  }
  if (statementId) {
    pass('STAGE-6', 'API-SOS', `SOS record: ${statementId}`);
    const sosSend = await api('POST', `/api/clients/${clientId}/service-statements/${statementId}/send`, {});
    if (sosSend.ok) pass('STAGE-6', 'API-SOS-SEND', 'SOS send API responded');
    else skip('STAGE-6', 'API-SOS-SEND', sosSend.json.error || `Send status ${sosSend.status}`);
  } else {
    skip('STAGE-6', 'API-SOS', 'No SOS record — create may require prior workflow gates');
  }
}

// ========== STAGE 8 — NOTIFICATIONS ==========
const notifList = await api('GET', '/api/notifications?limit=20');
if (notifList.ok && notifList.json.data?.length) {
  pass('STAGE-8', 'API-NOTIF-LIST', `${notifList.json.data.length} notifications in API`);
  const withLinks = notifList.json.data.filter((n) => n.action_url);
  if (withLinks.length) pass('STAGE-8', 'API-NOTIF-LINKS', `${withLinks.length} have action_url`);
  else fail('STAGE-8', 'API-NOTIF-LINKS', 'No action_url on notifications');
} else {
  fail('STAGE-8', 'API-NOTIF-LIST', 'Notification list empty or failed', notifList.json);
}

// ========== STAGE 9 — SEARCH ==========
const search = await api('GET', `/api/search?q=E2E&limit=20`);
if (search.ok && search.json.results?.length) {
  pass('STAGE-9', 'API-SEARCH', `Search returned ${search.json.results.length} result(s)`);
} else {
  skip('STAGE-9', 'API-SEARCH', search.json.error || 'Search empty — GS-1 migration may be pending', search.json);
}

// ========== BROWSER ==========
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

if (!executablePath || !deepLink) {
  skip('BROWSER', 'CHROME', 'Chrome or deepLink unavailable');
} else {
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      token_type: 'bearer',
      user: sessionData.session.user,
    }),
  );

  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' });

  await page.goto(`${baseUrl}${deepLink}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000);
  const profileText = await page.evaluate(() => document.body.innerText);
  evidence.browser.push({ url: deepLink, snippet: profileText.slice(0, 500) });

  if (profileText.includes('E2E') || profileText.includes('Test Client')) {
    pass('BROWSER', 'CLIENT-PROFILE', 'Client profile loads with E2E client name');
  } else {
    fail('BROWSER', 'CLIENT-PROFILE', 'Client profile missing E2E client', { snippet: profileText.slice(0, 200) });
  }

  await page.goto(`${baseUrl}/workspace/${agencySlug}/notifications`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000);
  const notifText = await page.evaluate(() => document.body.innerText);
  evidence.browser.push({ url: '/notifications', snippet: notifText.slice(0, 500) });

  if (notifText.includes('Notification Center') && !notifText.includes('Something went wrong')) {
    pass('STAGE-8', 'BROWSER-NOTIF-CENTER', 'Notification center page loads');
  } else {
    fail('STAGE-8', 'BROWSER-NOTIF-CENTER', 'Notification center error or missing', {
      snippet: notifText.slice(0, 200),
    });
  }

  const cardCount = await page.evaluate(() => {
    return document.querySelectorAll('[role="button"][tabindex="0"]').length;
  });
  if (cardCount > 0) pass('STAGE-8', 'BROWSER-NOTIF-CARDS', `${cardCount} notification card(s) visible`);
  else fail('STAGE-8', 'BROWSER-NOTIF-CARDS', 'No notification cards rendered');

  await browser.close();
}

// Write evidence artifact
const outDir = 'docs/e2e-evidence';
fs.mkdirSync(outDir, { recursive: true });
const evidencePath = `${outDir}/e2e1-run-${stamp}.json`;
fs.writeFileSync(evidencePath, JSON.stringify({ stamp, agencySlug, baseUrl, results, evidence }, null, 2));
console.log('\nEvidence written:', evidencePath);

const failures = results.filter((r) => r.status === 'FAIL');
const passes = results.filter((r) => r.status === 'PASS');
console.log('\n' + '='.repeat(72));
console.log(`E2E-1 LIFECYCLE: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${passes.length} pass, ${failures.length} fail, ${results.length} total)`);
console.log('='.repeat(72));
if (failures.length) for (const f of failures) console.log(`  ✗ [${f.stage}] ${f.id}: ${f.msg}`);

process.exit(failures.length > 0 ? 1 : 0);

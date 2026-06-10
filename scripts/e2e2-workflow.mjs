/**
 * E2E-2 Workflow execution + evidence collection
 * Usage: node scripts/e2e2-workflow.mjs [baseUrl]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const E2E = {
  clientId: '763c7ef3-a4ca-4495-b495-cbffad638c41',
  agreementId: 'b51f2447-7928-4317-84cd-de3d8b78c245',
  approvalId: '4b1db870-74ee-46e4-a9dd-881e140aad79',
  agencySlug: 'ritiklabs',
};

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
const screenshotDir = 'docs/e2e2-screenshots';
fs.mkdirSync(screenshotDir, { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const results = [];
function record(stage, id, status, msg, detail = {}) {
  results.push({ stage, id, status, msg, detail });
  console.log(`${status} [${stage}] ${id}: ${msg}`);
}

// Auth
const { data: agency } = await admin.from('agencies').select('id').eq('slug', E2E.agencySlug).single();
const { data: user } = await admin.from('users').select('id, email').eq('agency_id', agency.id).limit(1).single();
const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const token = sessionData.session.access_token;

async function api(method, path, body) {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    const json = contentType.includes('json') ? await res.json().catch(() => ({})) : null;
    return { status: res.status, ok: res.ok, json, contentType };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

async function dbAgreement() {
  return admin.from('agreements').select('*').eq('id', E2E.agreementId).single();
}
async function dbApproval() {
  return admin.from('application_approvals').select('*').eq('id', E2E.approvalId).single();
}

// STEP 1 — NTF-1
const { error: ntfErr } = await admin.from('notifications').select('priority').limit(1);
if (ntfErr?.message?.includes('does not exist')) {
  record('STEP-1', 'NTF1-MIGRATION', 'BLOCKED', 'Apply 20260617100000_ntf1_notifications.sql in Supabase SQL Editor', { error: ntfErr.message });
} else {
  record('STEP-1', 'NTF1-MIGRATION', 'PASS', 'NTF-1 columns present');
}

// Browser setup
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
let browser, page;
if (chrome) {
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
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
}

// STEP 2 — Agreement
const deepLink = `/workspace/${E2E.agencySlug}/clients/${E2E.clientId}?file_source=agreement&file_id=${E2E.agreementId}&tab=service_agreement`;
if (page) {
  await page.goto(`${baseUrl}${deepLink}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/02-agreement.png`, fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  if (text.includes('E2E Test Client') || text.includes('Service Agreement')) {
    record('STEP-2', 'BROWSER-AGREEMENT', 'PASS', 'Client agreement tab loads');
  } else {
    record('STEP-2', 'BROWSER-AGREEMENT', 'FAIL', 'Agreement tab missing expected content', { snippet: text.slice(0, 300) });
  }
}

const preview = await api('POST', '/api/agreements/preview-pdf', { agreementId: E2E.agreementId });
if (preview.ok || preview.contentType?.includes('pdf')) {
  record('STEP-2', 'API-PREVIEW-PDF', 'PASS', `Preview status ${preview.status}`);
} else {
  record('STEP-2', 'API-PREVIEW-PDF', 'FAIL', preview.json?.error || preview.error || `status ${preview.status}`, preview.json);
}

const { data: agrBefore } = await dbAgreement();
record('STEP-2', 'DB-AGREEMENT-BEFORE', agrBefore ? 'PASS' : 'FAIL', `status=${agrBefore?.status}`, { id: E2E.agreementId });

// STEP 3 — SignWell send
const signwellKeyOk = env.SIGNWELL_API_KEY && !env.SIGNWELL_API_KEY.includes('your_');
if (!signwellKeyOk) {
  record('STEP-3', 'SIGNWELL-SEND', 'BLOCKED', 'SIGNWELL_API_KEY missing or placeholder');
} else {
  const send = await api('POST', '/api/agreements/send', { agreementId: E2E.agreementId });
  if (send.ok) {
    record('STEP-3', 'API-SEND', 'PASS', `SignWell doc: ${send.json?.signwellDocId}`, send.json);
    if (page) {
      await page.screenshot({ path: `${screenshotDir}/03-signwell-sent.png`, fullPage: true });
    }
    const { data: agrAfter } = await dbAgreement();
    if (agrAfter?.signwell_document_id) {
      record('STEP-3', 'DB-SIGNWELL-ID', 'PASS', agrAfter.signwell_document_id);
      // Simulate webhook if hook id available
      const hookId = env.SIGNWELL_WEBHOOK_ID?.trim();
      if (hookId) {
        const eventType = 'document_completed';
        const time = Math.floor(Date.now() / 1000);
        const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
        const whRes = await fetch(`${baseUrl}/api/webhooks/signwell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: { type: eventType, time, hash }, data: { object: { id: agrAfter.signwell_document_id } } }),
        });
        const whJson = await whRes.json().catch(() => ({}));
        await new Promise((r) => setTimeout(r, 3000));
        const { data: agrSigned } = await dbAgreement();
        if (agrSigned?.signed_at || agrSigned?.status === 'signed' || agrSigned?.status === 'completed') {
          record('STEP-3', 'WEBHOOK-SIGNED', 'PASS', `status=${agrSigned.status}`, { signed_at: agrSigned.signed_at });
          if (page) await page.screenshot({ path: `${screenshotDir}/04-signwell-signed.png`, fullPage: true });
        } else {
          record('STEP-3', 'WEBHOOK-SIGNED', 'FAIL', 'Webhook did not update agreement', { whStatus: whRes.status, whJson, agrSigned });
        }
      } else {
        record('STEP-3', 'WEBHOOK-SIGNED', 'BLOCKED', 'SIGNWELL_WEBHOOK_ID missing — cannot simulate signed webhook');
      }
    } else {
      record('STEP-3', 'DB-SIGNWELL-ID', 'FAIL', 'No signwell_document_id after send', agrAfter);
    }
  } else {
    record('STEP-3', 'API-SEND', 'FAIL', send.json?.error || send.json?.message || send.error || `status ${send.status}`, send.json);
    if (send.status === 401 || send.json?.error?.includes('401')) {
      record('STEP-3', 'SIGNWELL-CREDENTIALS', 'BLOCKED', 'SignWell API returned 401 — verify SIGNWELL_API_KEY in SignWell dashboard');
    }
  }
}

// STEP 4 — Approval
if (page) {
  const apLink = `/workspace/${E2E.agencySlug}/clients/${E2E.clientId}?file_source=application_approval&file_id=${E2E.approvalId}&tab=approval`;
  await page.goto(`${baseUrl}${apLink}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/05-approval.png`, fullPage: true });
}
const { data: apRow } = await dbApproval();
record('STEP-4', 'DB-APPROVAL', apRow ? 'PASS' : 'FAIL', `status=${apRow?.status}`, { client_signed_at: apRow?.client_signed_at });

// STEP 5 — Lodgement
const lodge = await api('POST', `/api/approvals/${E2E.approvalId}/transition`, { action: 'lodged' });
if (lodge.ok) {
  record('STEP-5', 'API-LODGE', 'PASS', lodge.json);
  if (page) await page.screenshot({ path: `${screenshotDir}/06-lodgement.png`, fullPage: true });
} else {
  record('STEP-5', 'API-LODGE', 'FAIL', lodge.json?.error || `status ${lodge.status}`, lodge.json);
}
const { data: apLodged } = await dbApproval();
record('STEP-5', 'DB-LODGE', apLodged?.lodged_at ? 'PASS' : 'FAIL', `lodged_at=${apLodged?.lodged_at}`);

// STEP 6 — SOS
const sosList = await api('GET', `/api/clients/${E2E.clientId}/service-statements`);
let statementId = sosList.json?.statements?.[0]?.id;
if (!statementId) {
  const sosCreate = await api('POST', `/api/clients/${E2E.clientId}/service-statements`, { agreementId: E2E.agreementId, approvalId: E2E.approvalId });
  statementId = sosCreate.json?.statement?.id || sosCreate.json?.id;
}
if (statementId) {
  record('STEP-6', 'API-SOS', 'PASS', statementId);
  const sosSend = await api('POST', `/api/clients/${E2E.clientId}/service-statements/${statementId}/send`, {});
  record('STEP-6', 'API-SOS-SEND', sosSend.ok ? 'PASS' : 'FAIL', sosSend.json?.error || `status ${sosSend.status}`);
  if (page) await page.screenshot({ path: `${screenshotDir}/07-sos.png`, fullPage: true });
} else {
  record('STEP-6', 'API-SOS', 'FAIL', 'Could not create SOS — workflow gates may block');
}

// STEP 7 — Completion
const compliance = await api('GET', `/api/clients/${E2E.clientId}/compliance`);
record('STEP-7', 'API-COMPLIANCE', compliance.ok ? 'PASS' : 'FAIL', compliance.json?.score != null ? `score=${compliance.json.score}` : compliance.json?.error, compliance.json);
if (page) {
  const compLink = `/workspace/${E2E.agencySlug}/clients/${E2E.clientId}?file_source=application_approval&file_id=${E2E.approvalId}&tab=completion`;
  await page.goto(`${baseUrl}${compLink}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/08-completion.png`, fullPage: true });
}

// STEP 8 — Document library
if (page) {
  await page.goto(`${baseUrl}/workspace/${E2E.agencySlug}/documents/library`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/10-document-library.png`, fullPage: true });
  record('STEP-8', 'BROWSER-DOC-LIBRARY', 'PASS', 'Document library page captured');
}

// STEP 9 — Notifications
const notifs = await api('GET', '/api/notifications?limit=10');
record('STEP-9', 'API-NOTIFICATIONS', notifs.ok ? 'PASS' : 'FAIL', `count=${notifs.json?.count}`);
if (page) {
  await page.goto(`${baseUrl}/workspace/${E2E.agencySlug}/notifications`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/09-notifications.png`, fullPage: true });
}

// STEP 10 — Audit
const { data: audit } = await admin.from('document_audit_events').select('event_type, document_type, created_at').eq('client_id', E2E.clientId).order('created_at', { ascending: false });
record('STEP-10', 'DB-AUDIT', audit?.length ? 'PASS' : 'FAIL', `${audit?.length || 0} document_audit_events`, { types: audit?.map((a) => a.event_type) });

const { data: notes } = await admin.from('file_notes').select('id, note_type').eq('client_id', E2E.clientId).limit(5);
record('STEP-10', 'DB-FILE-NOTES', notes?.length ? 'PASS' : 'FAIL', `${notes?.length || 0} file notes`);

// Onboarding screenshot — client profile as proxy
if (page) {
  await page.goto(`${baseUrl}/workspace/${E2E.agencySlug}/onboarding/new`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.screenshot({ path: `${screenshotDir}/01-onboarding.png`, fullPage: true });
  await browser.close();
}

const outPath = 'docs/e2e-evidence/e2e2-workflow-results.json';
fs.mkdirSync('docs/e2e-evidence', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), E2E, results }, null, 2));
console.log('\nResults:', outPath);
console.log('Screenshots:', screenshotDir);

const fails = results.filter((r) => r.status === 'FAIL').length;
const blocked = results.filter((r) => r.status === 'BLOCKED').length;
const passes = results.filter((r) => r.status === 'PASS').length;
console.log(`\nE2E-2 RUN: ${passes} PASS, ${fails} FAIL, ${blocked} BLOCKED`);
process.exit(fails > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * NATIVE-AGREEMENT-SIGNING verification gate E2E.
 * Usage: node scripts/native-agreement-signing-e2e.mjs [baseUrl] [agencySlug]
 *
 * Requires: SIGNING_PROVIDER=native on target server, migration applied.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHA256_LEN = 64;

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
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const baseUrl = (argv[0] || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const agencySlug = argv[1] || 'ritiklabs';
const stamp = Date.now();

const evidenceDir = 'docs/e2e-evidence';
const screenshotDir = path.join(evidenceDir, 'native-signing-screenshots');
const outJson = path.join(evidenceDir, 'native-agreement-signing.json');
fs.mkdirSync(screenshotDir, { recursive: true });

const evidence = {
  task: 'NATIVE-AGREEMENT-SIGNING-VERIFICATION',
  timestamp: new Date().toISOString(),
  baseUrl,
  agencySlug,
  overall: 'FAIL',
  checks: [],
  ids: {},
  hashes: {},
  screenshots: [],
};

const results = [];
function record(id, status, msg, detail = {}) {
  results.push({ id, status, msg, detail });
  evidence.checks.push({ id, status, msg, detail });
  console.log(`${status.padEnd(6)} ${id}: ${msg}`);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getSession() {
  const { data: agency } = await admin.from('agencies').select('id, slug').eq('slug', agencySlug).maybeSingle();
  if (!agency) throw new Error(`Agency ${agencySlug} not found`);
  const { data: users } = await admin.from('users').select('id, email, role').eq('agency_id', agency.id);
  const user = users?.find((u) => u.role === 'owner') || users?.[0];
  if (!user) throw new Error('No user');
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  if (linkErr) throw linkErr;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (otpErr || !sessionData.session) throw otpErr || new Error('No session');
  return { agency, user, session: sessionData.session };
}

async function shot(page, name) {
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(file);
}

function isSha256(v) {
  return typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
}

async function main() {
  // STEP 1 — Migration gate
  const probe = spawnSync(process.execPath, ['scripts/native-signing-migration-probe.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  record('migration_probe', probe.status === 0 ? 'PASS' : 'FAIL', probe.status === 0 ? 'all columns exist' : 'columns missing — see NATIVE_SIGNING_MIGRATION_PROBE.json');
  if (probe.status !== 0) {
    evidence.overall = 'FAIL';
    fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
    console.log('\nOverall: FAIL (migration gate)');
    process.exit(1);
  }

  const { agency, user, session } = await getSession();
  evidence.ids.agencyId = agency.id;
  evidence.ids.userId = user.id;
  const token = session.access_token;

  const { data: matterType } = await admin.from('matter_types').select('id, name').eq('agency_id', agency.id).limit(1).maybeSingle();
  const clientEmail = `native.sign.${stamp}@immimate.au`;
  const clientFirst = 'Native';
  const clientMiddle = 'Sign';
  const clientLast = `Test${stamp}`;

  const formData = {
    clientName: `${clientFirst} ${clientMiddle} ${clientLast}`,
    clientEmail,
    clientPhone: '+61400111222',
    clientFirstName: clientFirst,
    clientMiddleName: clientMiddle,
    clientLastName: clientLast,
    clientDob: '1990-06-15',
    clientAddress: '1 Test St, Melbourne VIC 3000',
    matterTypeId: matterType?.id,
    matterType: matterType?.name || 'Visa Application',
    visaSubclass: '190',
    visaStreamLabel: 'Skilled Nominated',
    responsibleRma: user.id,
    professionalFeeBlocks: [{ id: '1', description: 'Initial consultation', amount: '4200' }],
    governmentFees: [],
    depositRequired: '1400',
    scopeOfServices: 'Migration advice and visa application preparation.',
    termsTemplate: 'Standard Terms',
    governingLaw: 'Victoria (Australia)',
    agreementDate: new Date().toISOString().slice(0, 10),
    ccMe: false,
    autoRemind7Days: false,
    emailOnComplete: false,
    emailMessage: 'Please sign your service agreement.',
  };

  // STEP 2 — Provider verification via API
  const sendRes = await fetch(`${baseUrl}/api/agreements/standard`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData,
      dispatchOptions: { responsibleRmaId: user.id, emailMessage: formData.emailMessage },
      agencySnapshot: { name: 'Test Agency' },
      selectedClauses: [],
      selectedClauseIds: [],
    }),
  });
  const sendJson = await sendRes.json().catch(() => ({}));
  const agreementId = sendJson.agreementId;
  evidence.ids.agreementId = agreementId;

  record('api_send_http', sendRes.ok ? 'PASS' : 'FAIL', `HTTP ${sendRes.status}`);
  record('signing_provider_response', sendJson.signingProvider === 'native' ? 'PASS' : 'FAIL', sendJson.signingProvider || sendJson.error || 'missing');
  record('signing_url_returned', sendJson.signingUrl ? 'PASS' : 'FAIL', sendJson.signingUrl || 'none');
  record('no_signwell_in_stages', !JSON.stringify(sendJson.stages || []).includes('SignWell') ? 'PASS' : 'FAIL', 'stages checked');

  if (!agreementId) {
    fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  const { data: agrRow } = await admin.from('agreements').select('*').eq('id', agreementId).single();
  record('db_signing_provider', agrRow?.signing_provider === 'native' ? 'PASS' : 'FAIL', agrRow?.signing_provider || 'missing');
  record('db_signing_token', agrRow?.signing_token ? 'PASS' : 'FAIL', agrRow?.signing_token || 'missing');
  record('db_no_signwell_id', !agrRow?.signwell_document_id ? 'PASS' : 'FAIL', agrRow?.signwell_document_id || 'none');
  evidence.ids.signingToken = agrRow?.signing_token;
  evidence.ids.signingUrl = sendJson.signingUrl;

  const signingToken = agrRow?.signing_token;
  if (!signingToken) {
    fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  // STEP 3 — Browser E2E
  const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => fs.existsSync(p));
  if (!chrome) {
    record('browser', 'FAIL', 'Chrome not found');
    fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(`${baseUrl}/agreement/sign/${signingToken}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(2000);
  await shot(page, '02-client-view.png');
  record('portal_loads', /Sign Service Agreement|Secure Signing Portal/i.test(await page.evaluate(() => document.body.innerText)) ? 'PASS' : 'FAIL', 'portal UI');

  const viewedRow = await admin.from('agreements').select('viewed_at, status').eq('id', agreementId).single();
  record('viewed_at', viewedRow.data?.viewed_at ? 'PASS' : 'FAIL', viewedRow.data?.viewed_at || 'missing');

  const { data: viewedAudit } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', agreementId)
    .eq('event_type', 'viewed')
    .maybeSingle();
  record('audit_viewed', viewedAudit ? 'PASS' : 'FAIL', viewedAudit?.event_timestamp || 'missing');

  const dlRes = await fetch(`${baseUrl}/api/public/agreement-sign/${signingToken}/download`, { redirect: 'manual' });
  record('download_redirect', dlRes.status === 307 || dlRes.status === 302 ? 'PASS' : 'FAIL', `HTTP ${dlRes.status}`);

  const downloadedRow = await admin.from('agreements').select('downloaded_at').eq('id', agreementId).single();
  record('downloaded_at', downloadedRow.data?.downloaded_at ? 'PASS' : 'FAIL', downloadedRow.data?.downloaded_at || 'missing');

  // Declarations + name + signature
  await page.evaluate(() => {
    for (const cb of document.querySelectorAll('input[type=checkbox]')) {
      cb.click();
    }
  });
  await page.type('input[placeholder*="passport"]', `${clientFirst} ${clientMiddle} ${clientLast}`, { delay: 15 });
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.lineTo(120, 40);
    ctx.lineTo(220, 90);
    ctx.stroke();
  });
  await sleep(500);
  await shot(page, '03-client-sign.png');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Sign Agreement/i.test(b.textContent || ''));
    btn?.click();
  });
  await sleep(8000);
  await shot(page, '04-signed-success.png');

  const signedText = await page.evaluate(() => document.body.innerText);
  record('sign_success_ui', /Agreement Signed|signed successfully/i.test(signedText) ? 'PASS' : 'FAIL', signedText.slice(0, 120));

  await browser.close();

  // STEP 4 — Storage
  const { data: finalRow } = await admin.from('agreements').select('*').eq('id', agreementId).single();
  const storageChecks = [
    { id: 'signed_pdf', path: finalRow?.signed_pdf_storage_path, bucket: 'secure_documents' },
    { id: 'signing_record', path: finalRow?.signing_record_storage_path, bucket: 'documents' },
    { id: 'client_signature', path: finalRow?.client_signature_storage_path, bucket: 'secure_documents' },
  ];
  const storageReport = [];
  for (const sc of storageChecks) {
    let ok = false;
    let size = 0;
    if (sc.path) {
      const { data, error } = await admin.storage.from(sc.bucket).download(sc.path);
      if (!error && data) {
        size = (await data.arrayBuffer()).byteLength;
        ok = size > 0;
      }
    }
    record(`storage_${sc.id}`, ok ? 'PASS' : 'FAIL', sc.path ? `${sc.bucket}/${sc.path} (${size}b)` : 'missing');
    storageReport.push({ ...sc, size, ok });
  }
  fs.writeFileSync('docs/NATIVE_SIGNING_STORAGE_REPORT.md', `# Native Signing Storage Report\n\nGenerated: ${new Date().toISOString()}\n\n${storageReport.map((r) => `- **${r.id}**: ${r.ok ? 'PASS' : 'FAIL'} — ${r.path || 'missing'} (${r.size} bytes)`).join('\n')}\n\n**Verdict:** ${storageReport.every((r) => r.ok) ? 'PASS' : 'NOT PASS'}\n`);

  // STEP 5 — PDF visual (save signed PDF for manual review)
  if (finalRow?.signed_pdf_storage_path) {
    const { data: pdfBlob } = await admin.storage.from('secure_documents').download(finalRow.signed_pdf_storage_path);
    if (pdfBlob) {
      const buf = Buffer.from(await pdfBlob.arrayBuffer());
      const pdfOut = path.join(screenshotDir, 'signed-agreement-review.pdf');
      fs.writeFileSync(pdfOut, buf);
      record('signed_pdf_bytes', buf.slice(0, 4).toString() === '%PDF' ? 'PASS' : 'FAIL', `${buf.length} bytes → ${pdfOut}`);
    }
  }

  // STEP 6 — Audit events
  const { data: audits } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', agreementId)
    .order('event_timestamp', { ascending: true });

  const actionTypes = [
    'agreement_sent',
    'agreement_viewed',
    'agreement_downloaded',
    'agreement_signed',
    'agreement_completed',
    'agreement_record_generated',
    'file_note_created',
    'agent_notified',
    'client_notified',
  ];
  for (const action of actionTypes) {
    const found = audits?.find(
      (a) =>
        a.metadata?.action === action ||
        (action === 'agreement_sent' && a.event_type === 'sent') ||
        (action === 'agreement_viewed' && a.event_type === 'viewed') ||
        (action === 'agreement_signed' && a.event_type === 'signed') ||
        (action === 'agreement_completed' && a.event_type === 'acknowledged'),
    );
    record(`audit_${action}`, found ? 'PASS' : 'FAIL', found?.event_timestamp || 'missing');
  }

  // STEP 7 — Hashes
  const hashFields = ['pdf_hash', 'signed_pdf_hash', 'signature_hash', 'audit_hash', 'signing_record_hash'];
  for (const h of hashFields) {
    const val = finalRow?.[h];
    evidence.hashes[h] = val;
    record(`hash_${h}`, isSha256(val) ? 'PASS' : 'FAIL', val || 'missing');
  }

  // STEP 8 — Email (Resend IDs in audit)
  const emailAudits = audits?.filter((a) => a.metadata?.resend_id) || [];
  record('email_resend_ids', emailAudits.length >= 1 ? 'PASS' : 'WARN', `${emailAudits.length} resend_id rows`);

  // STEP 9 — Security
  const badToken = await fetch(`${baseUrl}/api/public/agreement-sign/00000000-0000-0000-0000-000000000000`);
  record('security_invalid_token', badToken.status === 404 ? 'PASS' : 'FAIL', `HTTP ${badToken.status}`);

  const reuseRes = await fetch(`${baseUrl}/api/public/agreement-sign/${signingToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sign',
      clientName: `${clientFirst} ${clientMiddle} ${clientLast}`,
      signaturePngBase64: 'data:image/png;base64,iVBORw0KGgo=',
      declarations: { readAgreement: true, understandFees: true, authoriseAgent: true, understandRefund: true },
    }),
  });
  record('security_reuse_sign', reuseRes.status === 409 ? 'PASS' : 'FAIL', `HTTP ${reuseRes.status}`);

  const regenRes = await fetch(`${baseUrl}/api/agreements/${agreementId}/regenerate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  record('security_regen_blocked', regenRes.status === 409 || regenRes.status === 400 || regenRes.status === 403 ? 'PASS' : 'FAIL', `HTTP ${regenRes.status}`);

  const fails = results.filter((r) => r.status === 'FAIL');
  const warns = results.filter((r) => r.status === 'WARN');
  evidence.overall = fails.length === 0 && warns.length === 0 ? 'PASS' : 'FAIL';
  fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
  console.log(`\nOverall: ${evidence.overall} (${fails.length} FAIL, ${warns.length} WARN)`);
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  record('UNHANDLED', 'FAIL', e.message);
  fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
  process.exit(1);
});

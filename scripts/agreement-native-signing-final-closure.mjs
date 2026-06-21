#!/usr/bin/env node
/**
 * AGREEMENT-NATIVE-SIGNING-FINAL-PRODUCTION-CLOSURE
 * Usage: node scripts/agreement-native-signing-final-closure.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const baseUrl = (argv[0] || 'https://immisign.vercel.app').replace(/\/$/, '');
const agencySlug = argv[1] || 'ritiklabs';
const stamp = Date.now();

const evidenceDir = 'docs/e2e-evidence';
const screenshotDir = path.join(evidenceDir, 'native-signing-closure');
const outJson = path.join(evidenceDir, 'native-agreement-signing-closure.json');
const outMd = 'docs/NATIVE_AGREEMENT_SIGNING_CLOSURE_REPORT.md';
fs.mkdirSync(screenshotDir, { recursive: true });

const evidence = {
  task: 'AGREEMENT-NATIVE-SIGNING-FINAL-PRODUCTION-CLOSURE',
  timestamp: new Date().toISOString(),
  baseUrl,
  agencySlug,
  overall: 'NOT PASS',
  checks: [],
  ids: {},
  screenshots: [],
  consoleErrors: [],
};

function record(phase, id, status, msg, detail = {}) {
  evidence.checks.push({ phase, id, status, msg, detail });
  console.log(`[${phase}] ${status.padEnd(6)} ${id}: ${msg}`);
}

async function getSession() {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: agency } = await admin.from('agencies').select('id, slug, name').eq('slug', agencySlug).maybeSingle();
  if (!agency) throw new Error(`Agency ${agencySlug} not found`);
  const { data: users } = await admin.from('users').select('id, email, role, full_name').eq('agency_id', agency.id);
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
  return { admin, agency, user, session: sessionData.session };
}

async function shot(page, name) {
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(file);
}

async function waitForSignaturePreview(page, timeout = 90000) {
  await page.waitForFunction(
    () => {
      if (document.body.innerText.includes('Loading signature')) return false;
      const img = document.querySelector('img[alt="Professional signature preview"]');
      if (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0) return true;
      return document.body.innerText.includes('No signature uploaded yet');
    },
    { timeout },
  ).catch(() => null);
}

async function previewOk(page) {
  return page.evaluate(() => {
    const img = document.querySelector('img[alt="Professional signature preview"]');
    return Boolean(img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);
  });
}

function pdfHasEmbeddedImages(buf) {
  const s = buf.toString('latin1');
  return /\/Subtype\s*\/Image/.test(s) || /\/Type\s*\/XObject/.test(s);
}

function pdfContainsHash(buf, hash) {
  if (!hash || hash.length < 16) return false;
  return buf.toString('latin1').includes(hash);
}

async function pollPostSignComplete(admin, agreementId, maxAttempts = 48, intervalMs = 5000) {
  let row = null;
  let auditEvents = [];
  for (let i = 0; i < maxAttempts; i++) {
    const [{ data }, { data: events }] = await Promise.all([
      admin.from('agreements').select('*').eq('id', agreementId).single(),
      admin
        .from('document_audit_events')
        .select('event_type, metadata')
        .eq('document_id', agreementId)
        .eq('document_type', 'service_agreement'),
    ]);
    row = data;
    auditEvents = events || [];
    const hasClientNotified = auditEvents.some(
      (e) => e.event_type === 'completed' && e.metadata?.action === 'client_notified',
    );
    const hasAgentNotified = auditEvents.some(
      (e) => e.event_type === 'completed' && e.metadata?.action === 'agent_notified',
    );
    const hasFileNoteCreated = auditEvents.some(
      (e) => e.event_type === 'completed' && e.metadata?.action === 'file_note_created',
    );
    if (
      row?.status === 'completed' &&
      row?.signing_record_storage_path &&
      row?.signed_pdf_hash &&
      row?.audit_hash &&
      row?.signing_record_hash &&
      hasClientNotified &&
      hasAgentNotified &&
      hasFileNoteCreated
    ) {
      return { row, auditEvents };
    }
    await sleep(intervalMs);
  }
  return { row, auditEvents };
}

async function createTestPng(page, outPath) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 120;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 80);
    ctx.lineTo(200, 30);
    ctx.lineTo(370, 90);
    ctx.stroke();
    return c.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
}

function writeReport() {
  const failed = evidence.checks.filter((c) => c.status === 'FAIL');
  const warned = evidence.checks.filter((c) => c.status === 'WARN');
  const passed = evidence.checks.filter((c) => c.status === 'PASS');
  evidence.overall =
    failed.length === 0 && warned.length === 0 && passed.length > 0 ? 'PASS' : 'NOT PASS';
  fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));
  const md = `# Native Agreement Signing — Production Closure Report

Generated: ${evidence.timestamp}
Target: ${evidence.baseUrl}
Agency: ${evidence.agencySlug}

## Overall: **${evidence.overall}**

| PASS | FAIL | WARN |
|------|------|------|
| ${passed.length} | ${failed.length} | ${warned.length} |

${failed.length ? `### Failures\n${failed.map((f) => `- [${f.phase}] ${f.id}: ${f.msg}`).join('\n')}\n` : ''}
${warned.length ? `### Warnings\n${warned.map((w) => `- [${w.phase}] ${w.id}: ${w.msg}`).join('\n')}\n` : ''}

### Evidence
${evidence.screenshots.map((s) => `- ${s}`).join('\n')}

Agreement: \`${evidence.ids.agreementId || 'n/a'}\`
Client: \`${evidence.ids.clientId || 'n/a'}\`
`;
  fs.writeFileSync(outMd, md);
  console.log(`\nOverall: ${evidence.overall}`);
  console.log(`Report: ${outMd}`);
}

async function main() {
  const P1 = 'PHASE1_UI';
  const P2 = 'PHASE2_AGENT_PDF';
  const P3 = 'PHASE3_CLIENT_PDF';
  const P4 = 'PHASE4_FILE_NOTE';
  const P5 = 'PHASE5_EMAILS';
  const P6 = 'PHASE6_AUDIT_PANEL';
  const P7 = 'PHASE7_SIGNING_RECORD';
  const P8 = 'PHASE8_PRODUCTION';

  const { admin, agency, user, session } = await getSession();
  evidence.ids.agencyId = agency.id;
  evidence.ids.userId = user.id;

  const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => fs.existsSync(p));
  if (!chrome) throw new Error('Chrome not found');

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    token_type: 'bearer',
    user: session.user,
  }));
  const host = new URL(baseUrl).hostname;

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 300000,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  await page.setViewport({ width: 1400, height: 900 });
  await page.setCookie({ name: cookieName, value: cookieValue, domain: host, path: '/', httpOnly: false });
  page.on('console', (msg) => {
    if (msg.type() === 'error') evidence.consoleErrors.push(msg.text());
  });

  const pngPath = path.join(screenshotDir, `signature-${stamp}.png`);
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await createTestPng(page, pngPath);

  const profileUrl = `${baseUrl}/workspace/${agencySlug}/settings?section=Profile`;

  async function uploadViaBrowser() {
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some((b) =>
          /Upload signature|Replace signature/i.test(b.textContent || ''),
        ),
      { timeout: 90000 },
    ).catch(() => null);
    await sleep(500);
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /Upload signature|Replace signature/i.test(b.textContent || ''),
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) return false;
    const input = await page.waitForSelector('input[type="file"]', { timeout: 10000 }).catch(() => null);
    if (!input) return false;
    await input.uploadFile(pngPath);
    await sleep(4000);
    await waitForSignaturePreview(page);
    return true;
  }

  // ── PHASE 1: Professional Signature UI ──
  record(P1, 'upload', (await uploadViaBrowser()) ? 'PASS' : 'FAIL', 'Upload via browser');
  await shot(page, '01-after-upload.png');

  for (let cycle = 1; cycle <= 3; cycle++) {
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForSignaturePreview(page);
    const ok = await previewOk(page);
    const hasDate = /Uploaded:/i.test(await page.evaluate(() => document.body.innerText));
    record(P1, `refresh_${cycle}_preview`, ok ? 'PASS' : 'FAIL', `Preview after refresh ${cycle}`);
    record(P1, `refresh_${cycle}_date`, hasDate ? 'PASS' : 'FAIL', `Uploaded date after refresh ${cycle}`);
    if (cycle === 1) await shot(page, '02-preview-after-refresh.png');
  }

  record(P1, 'replace', (await uploadViaBrowser()) ? 'PASS' : 'FAIL', 'Replace signature');

  const deleteWait = page.waitForResponse(
    (r) => r.url().includes('/api/signatures/professional') && r.request().method() === 'DELETE',
    { timeout: 30000 },
  );
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Delete/i.test(b.textContent || ''));
    btn?.click();
  });
  const deleteRes = await deleteWait.catch(() => null);
  record(P1, 'delete_http', deleteRes?.ok?.() ? 'PASS' : 'FAIL', deleteRes ? `HTTP ${deleteRes.status()}` : 'no response');
  await waitForSignaturePreview(page);
  const deleted = await page.evaluate(() => document.body.innerText.includes('No signature uploaded yet'));
  record(P1, 'delete_ui', deleted ? 'PASS' : 'FAIL', 'UI shows no signature after delete');
  await shot(page, '03-after-delete.png');

  record(P1, 'reupload', (await uploadViaBrowser()) ? 'PASS' : 'FAIL', 'Re-upload after delete');
  await page.reload({ waitUntil: 'networkidle2' });
  await waitForSignaturePreview(page);
  record(P1, 'reupload_refresh', (await previewOk(page)) ? 'PASS' : 'FAIL', 'Preview after re-upload refresh');
  record(P1, 'console_errors', evidence.consoleErrors.length === 0 ? 'PASS' : 'FAIL', `${evidence.consoleErrors.length} errors`);

  // ── Create agreement + send ──
  const token = session.access_token;
  const { data: matterType } = await admin.from('matter_types').select('id, name').eq('agency_id', agency.id).limit(1).maybeSingle();
  const clientEmail = `closure.${stamp}@immimate.au`;
  const clientFirst = 'Closure';
  const clientLast = `Test${stamp}`;

  const formData = {
    clientName: `${clientFirst} ${clientLast}`,
    clientEmail,
    clientPhone: '+61400111222',
    clientFirstName: clientFirst,
    clientMiddleName: '',
    clientLastName: clientLast,
    clientDob: '1990-01-15',
    clientAddress: '1 Test St, Sydney NSW 2000',
    matterTypeId: matterType?.id,
    matterType: matterType?.name || 'Visa Application',
    visaSubclass: '190',
    visaStreamLabel: 'Skilled Nominated',
    responsibleRma: user.id,
    professionalFeeBlocks: [{ id: '1', description: 'Professional fees', amount: '3500' }],
    governmentFees: [],
    depositRequired: '1200',
    scopeOfServices: 'Migration advice.',
    termsTemplate: 'Standard Terms',
    governingLaw: 'NSW (Australia)',
    agreementDate: new Date().toISOString().slice(0, 10),
    ccMe: false,
    autoRemind7Days: false,
    emailOnComplete: false,
    emailMessage: 'Please sign your agreement.',
  };

  const sendRes = await fetch(`${baseUrl}/api/agreements/standard`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData,
      dispatchOptions: { responsibleRmaId: user.id, emailMessage: formData.emailMessage },
      agencySnapshot: { name: agency.name },
      selectedClauses: [],
      selectedClauseIds: [],
    }),
  });
  const sendJson = await sendRes.json().catch(() => ({}));
  const agreementId = sendJson.agreementId;
  evidence.ids.agreementId = agreementId;
  record(P8, 'send', sendRes.ok ? 'PASS' : 'FAIL', sendJson.error || 'Agreement sent');

  if (!agreementId) {
    await browser.close();
    writeReport();
    process.exit(1);
  }

  const { data: agrRow } = await admin.from('agreements').select('*').eq('id', agreementId).single();
  evidence.ids.clientId = agrRow?.client_id;

  const { data: docRow } = await admin
    .from('documents')
    .select('file_url')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (docRow?.file_url) {
    const { data: pdfBlob } = await admin.storage.from('secure_documents').download(docRow.file_url);
    if (pdfBlob) {
      const sentBuf = Buffer.from(await pdfBlob.arrayBuffer());
      fs.writeFileSync(path.join(screenshotDir, '04-sent-agreement.pdf'), sentBuf);
      record(P2, 'sent_pdf_valid', sentBuf.slice(0, 4).toString() === '%PDF' ? 'PASS' : 'FAIL', `${sentBuf.length} bytes`);
      record(P2, 'sent_pdf_images', pdfHasEmbeddedImages(sentBuf) ? 'PASS' : 'FAIL', 'Agent PNG embedded in sent PDF');
      record(P2, 'agent_signed_at', agrRow?.agent_signed_at ? 'PASS' : 'FAIL', agrRow?.agent_signed_at || 'missing');
    }
  }

  const signingToken = agrRow?.signing_token;
  if (!signingToken) {
    await browser.close();
    writeReport();
    process.exit(1);
  }

  // ── Client sign ──
  await page.goto(`${baseUrl}/agreement/sign/${signingToken}`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await shot(page, '05-client-portal.png');

  await page.evaluate(() => {
    for (const label of document.querySelectorAll('label')) {
      const cb = label.querySelector('input[type=checkbox]');
      if (cb instanceof HTMLInputElement && !cb.checked) label.click();
    }
  });
  const nameInput = await page.$('input[placeholder*="passport"], input[placeholder*="legal"], input[placeholder*="ID"]');
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type(`${clientFirst} ${clientLast}`, { delay: 10 });
  }
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 30, box.y + 80);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 40, { steps: 12 });
      await page.mouse.up();
    }
  }
  await sleep(1500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Sign Agreement/i.test(b.textContent || ''))?.click();
  });
  await page.waitForFunction(
    () => /Agreement Signed|signed successfully/i.test(document.body.innerText),
    { timeout: 240000 },
  ).catch(() => null);
  await shot(page, '06-client-signed.png');
  record(P3, 'client_sign_ui', /Agreement Signed/i.test(await page.evaluate(() => document.body.innerText)) ? 'PASS' : 'FAIL', 'Success page');

  const { row: finalRow, auditEvents } = await pollPostSignComplete(admin, agreementId);
  record(P8, 'status_completed', finalRow?.status === 'completed' ? 'PASS' : 'FAIL', finalRow?.status || 'unknown');

  const clientNotifiedEvent = auditEvents.find(
    (e) => e.event_type === 'completed' && e.metadata?.action === 'client_notified',
  );
  const agentNotifiedEvent = auditEvents.find(
    (e) => e.event_type === 'completed' && e.metadata?.action === 'agent_notified',
  );
  const fileNoteCreatedEvent = auditEvents.find(
    (e) => e.event_type === 'completed' && e.metadata?.action === 'file_note_created',
  );
  record(P6, 'db_client_notified', clientNotifiedEvent ? 'PASS' : 'FAIL', 'document_audit_events client_notified');
  record(P6, 'db_agent_notified', agentNotifiedEvent ? 'PASS' : 'FAIL', 'document_audit_events agent_notified');
  record(P6, 'db_file_note_created', fileNoteCreatedEvent ? 'PASS' : 'FAIL', 'document_audit_events file_note_created');

  if (finalRow?.signed_pdf_storage_path) {
    const { data: signedBlob } = await admin.storage.from('secure_documents').download(finalRow.signed_pdf_storage_path);
    if (signedBlob) {
      const signedBuf = Buffer.from(await signedBlob.arrayBuffer());
      fs.writeFileSync(path.join(screenshotDir, '07-final-signed-agreement.pdf'), signedBuf);
      record(P3, 'final_pdf_images', pdfHasEmbeddedImages(signedBuf) ? 'PASS' : 'FAIL', 'Both signatures as embedded images');
      record(P3, 'client_sig_path', finalRow.client_signature_storage_path ? 'PASS' : 'FAIL', finalRow.client_signature_storage_path || 'missing');
    }
  }

  // ── PHASE 4: File note ──
  const { data: fileNotes } = await admin
    .from('file_notes')
    .select('*')
    .eq('reference_id', agreementId)
    .eq('is_system_note', true);
  const signedNote = fileNotes?.find((n) => /Agreement Signed/i.test(n.body || ''));
  record(P4, 'file_note_row', signedNote ? 'PASS' : 'FAIL', signedNote?.id || 'missing');
  if (signedNote) {
    const body = signedNote.body || '';
    record(P4, 'note_agreement_ref', /Agreement:/i.test(body) ? 'PASS' : 'FAIL', 'Agreement reference in body');
    record(P4, 'note_client', /Client:/i.test(body) ? 'PASS' : 'FAIL', 'Client in body');
    record(P4, 'note_timestamp', /Signed At:/i.test(body) ? 'PASS' : 'FAIL', 'Timestamp in body');
  }

  // ── PHASE 5: Emails ──
  const signedAt = finalRow?.signed_at || new Date().toISOString();
  const { data: emails } = await admin
    .from('email_delivery_audit')
    .select('*')
    .gte('created_at', signedAt)
    .order('created_at', { ascending: false });
  const clientEmailRow = emails?.find((e) => e.email_type === 'agreement_native_client_signed');
  const agentEmailRow = emails?.find((e) => e.email_type === 'agreement_native_agent_notify');
  record(P5, 'client_email', clientEmailRow?.resend_id ? 'PASS' : 'FAIL', clientEmailRow?.resend_id || 'missing');
  record(P5, 'client_email_status', clientEmailRow?.status ? 'PASS' : 'FAIL', clientEmailRow?.status || 'missing');
  record(P5, 'agent_email', agentEmailRow?.resend_id ? 'PASS' : 'FAIL', agentEmailRow?.resend_id || 'missing');
  record(P5, 'agent_email_status', agentEmailRow?.status ? 'PASS' : 'FAIL', agentEmailRow?.status || 'missing');

  // ── PHASE 7: Signing record PDF ──
  record(P7, 'record_storage_path', finalRow?.signing_record_storage_path ? 'PASS' : 'FAIL', finalRow?.signing_record_storage_path || 'missing');
  record(P7, 'record_ip_db', finalRow?.client_ip ? 'PASS' : 'FAIL', finalRow?.client_ip || 'missing');
  record(P7, 'record_user_agent_db', finalRow?.client_user_agent ? 'PASS' : 'FAIL', 'client_user_agent on agreement');
  record(P7, 'record_signature_hash', finalRow?.signature_hash ? 'PASS' : 'FAIL', 'signature_hash');
  record(P7, 'record_signed_pdf_hash', finalRow?.signed_pdf_hash ? 'PASS' : 'FAIL', 'signed_pdf_hash');
  record(P7, 'record_audit_hash', finalRow?.audit_hash ? 'PASS' : 'FAIL', 'audit_hash');
  record(P7, 'record_signing_record_hash', finalRow?.signing_record_hash ? 'PASS' : 'FAIL', 'signing_record_hash');

  if (finalRow?.signing_record_storage_path) {
    let blob = null;
    for (const bucket of ['documents', 'secure_documents']) {
      const { data } = await admin.storage.from(bucket).download(finalRow.signing_record_storage_path);
      if (data) {
        blob = data;
        break;
      }
    }
    if (blob) {
      const recBuf = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(path.join(screenshotDir, '08-signing-record.pdf'), recBuf);
      record(P7, 'record_pdf', recBuf.slice(0, 4).toString() === '%PDF' ? 'PASS' : 'FAIL', `${recBuf.length} bytes`);
      record(
        P7,
        'record_pdf_hash_pdf',
        pdfContainsHash(recBuf, finalRow.pdf_hash) ? 'PASS' : 'FAIL',
        'pdf_hash in signing record PDF',
      );
      record(
        P7,
        'record_signed_pdf_hash_pdf',
        pdfContainsHash(recBuf, finalRow.signed_pdf_hash) ? 'PASS' : 'FAIL',
        'signed_pdf_hash in signing record PDF',
      );
      record(
        P7,
        'record_signature_hash_pdf',
        pdfContainsHash(recBuf, finalRow.signature_hash) ? 'PASS' : 'FAIL',
        'signature_hash in signing record PDF',
      );
      record(
        P7,
        'record_audit_hash_pdf',
        pdfContainsHash(recBuf, finalRow.audit_hash) ? 'PASS' : 'FAIL',
        'audit_hash in signing record PDF',
      );
      record(
        P7,
        'record_signing_record_hash_pdf',
        pdfContainsHash(recBuf, finalRow.signing_record_hash) ? 'PASS' : 'FAIL',
        'signing_record_hash in signing record PDF',
      );
    } else {
      record(P7, 'record_pdf', 'FAIL', 'Could not download signing record PDF');
    }
  }

  // ── PHASE 6: Audit panel (browser) — reload after DB confirms events ──
  if (finalRow?.client_id) {
    await page.goto(`${baseUrl}/workspace/${agencySlug}/clients/${finalRow.client_id}`, {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });
    await sleep(2000);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2000);
    await shot(page, '09-client-audit-panel.png');
    const auditText = await page.evaluate(() => document.body.innerText);
    for (const label of ['Sent At', 'Viewed At', 'Signed At', 'Generated At']) {
      const re = new RegExp(`${label}[\\s\\S]{0,40}Not Provided`, 'i');
      record(P6, label.replace(/\s/g, '_').toLowerCase(), !re.test(auditText) ? 'PASS' : 'FAIL', label);
    }
    record(P6, 'client_notified', /Client Notified/i.test(auditText) ? 'PASS' : 'FAIL', 'Client Notified row');
    record(P6, 'agent_notified', /Agent Notified/i.test(auditText) ? 'PASS' : 'FAIL', 'Agent Notified row');
    record(P6, 'file_note_created', /File Note Created/i.test(auditText) ? 'PASS' : 'FAIL', 'File Note Created row');
  }

  record(P8, 'production_url', baseUrl.includes('immisign.vercel.app') ? 'PASS' : 'INFO', baseUrl);

  await browser.close();
  writeReport();
  process.exit(evidence.overall === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  record('FATAL', 'exception', 'FAIL', e.message);
  writeReport();
  process.exit(1);
});

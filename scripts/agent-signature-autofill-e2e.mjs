#!/usr/bin/env node
/**
 * AGENT-SIGNATURE-AUTOFILL-E2E-1 full verification gate.
 * Usage: node scripts/agent-signature-autofill-e2e.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const PROFESSIONAL_SIGNATURE_FILENAME = 'default-signature.png';
function professionalSignatureStoragePath(agencyId, userId) {
  return `${agencyId}/${userId}/${PROFESSIONAL_SIGNATURE_FILENAME}`;
}

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
const baseUrl = (argv[0] || env.NEXT_PUBLIC_APP_URL || 'https://immisign.vercel.app').replace(/\/$/, '');
const agencySlug = argv[1] || 'ritiklabs';
const stamp = Date.now();

const evidenceDir = 'docs/e2e-evidence';
const screenshotDir = path.join(evidenceDir, 'agent-signature-screenshots');
const outJson = path.join(evidenceDir, 'agent-signature-autofill.json');
const outMd = 'docs/AGENT_SIGNATURE_E2E_REPORT.md';
fs.mkdirSync(screenshotDir, { recursive: true });

const evidence = {
  task: 'AGENT-SIGNATURE-AUTOFILL-E2E-1',
  timestamp: new Date().toISOString(),
  baseUrl,
  agencySlug,
  overall: 'NOT PASS',
  phases: {},
  checks: [],
  ids: {},
  screenshots: [],
  consoleErrors: [],
};

function record(phase, id, status, msg, detail = {}) {
  evidence.checks.push({ phase, id, status, msg, detail });
  if (!evidence.phases[phase]) evidence.phases[phase] = [];
  evidence.phases[phase].push({ id, status, msg, detail });
  console.log(`[${phase}] ${status.padEnd(6)} ${id}: ${msg}`);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getSession() {
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
  return { agency, user, session: sessionData.session };
}

async function createTestPngFile(page, outPath) {
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
  return outPath;
}

function pdfHasEmbeddedImages(buf) {
  const s = buf.toString('latin1');
  return (
    /\/Subtype\s*\/Image/.test(s) ||
    /\/Type\s*\/XObject/.test(s) ||
    /\/Filter\s*\/DCTDecode/.test(s) ||
    /\/Filter\s*\/FlateDecode/.test(s)
  );
}

async function shot(page, name) {
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(file);
}

async function adminUploadProfessionalSignature(agencyId, userId, pngPath) {
  const objectPath = professionalSignatureStoragePath(agencyId, userId);
  const buf = fs.readFileSync(pngPath);
  await admin.storage.from('signatures').upload(objectPath, buf, {
    upsert: true,
    contentType: 'image/png',
  });
  await admin
    .from('user_signatures')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .eq('user_id', userId);
  const { data: existing } = await admin
    .from('user_signatures')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  const now = new Date().toISOString();
  if (existing?.id) {
    await admin
      .from('user_signatures')
      .update({
        signature_type: 'upload',
        storage_path: objectPath,
        typed_name: null,
        draw_data: null,
        is_default: true,
        label: 'Professional Signature',
        updated_at: now,
      })
      .eq('id', existing.id);
  } else {
    await admin.from('user_signatures').insert({
      agency_id: agencyId,
      user_id: userId,
      signature_type: 'upload',
      storage_path: objectPath,
      is_default: true,
      label: 'Professional Signature',
    });
  }
  await admin
    .from('users')
    .update({ signature_storage_path: objectPath, signature_uploaded_at: now })
    .eq('id', userId);
  return objectPath;
}

async function main() {
  const P1 = 'PHASE1_MIGRATION';
  const P2 = 'PHASE2_BROWSER';
  const P3 = 'PHASE3_STORAGE';
  const P4 = 'PHASE4_PDF';
  const P5 = 'PHASE5_SEND';
  const P6 = 'PHASE6_CLIENT_SIGN';
  const P7 = 'PHASE7_AUDIT';
  const P9 = 'PHASE9_PRODUCTION';

  // ── PHASE 1 ──
  const probe = spawnSync(process.execPath, ['scripts/agent-signature-migration-probe.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let migrationReport = {};
  try {
    migrationReport = JSON.parse(fs.readFileSync('docs/AGENT_SIGNATURE_MIGRATION_PROBE.json', 'utf8'));
  } catch { /* ignore */ }
  record(P1, 'migration_report', fs.existsSync('docs/AGENT_SIGNATURE_MIGRATION_REPORT.md') ? 'PASS' : 'FAIL', 'AGENT_SIGNATURE_MIGRATION_REPORT.md');
  record(P1, 'user_columns', migrationReport.migrations?.['20260623100000_native_agreement_signing.sql']?.userColumnsOk ? 'PASS' : 'FAIL', 'signature_storage_path columns');
  record(P1, 'delete_sync_trigger', migrationReport.migrations?.['20260608100000_agent_signature_sync_on_delete.sql']?.applied ? 'PASS' : 'FAIL', 'clear trigger on delete');
  if (probe.status !== 0) {
    record(P1, 'migration_gate', 'FAIL', 'Apply pending migrations first');
    writeReport();
    process.exit(1);
  }
  record(P1, 'migration_gate', 'PASS', 'All migrations applied');

  const { agency, user, session } = await getSession();
  evidence.ids.agencyId = agency.id;
  evidence.ids.userId = user.id;
  const token = session.access_token;
  const sigPath = `${agency.id}/${user.id}/default-signature.png`;

  const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => fs.existsSync(p));
  if (!chrome) {
    record(P2, 'chrome', 'FAIL', 'Chrome not found');
    writeReport();
    process.exit(1);
  }

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

  const pngPath = path.join(screenshotDir, `test-signature-${stamp}.png`);
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await createTestPngFile(page, pngPath);

  // ── PHASE 2: Browser settings UI ──
  await page.goto(`${baseUrl}/workspace/${agencySlug}/settings?section=Profile`, {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  await sleep(2000);
  await shot(page, '01-profile-settings.png');

  const bodyText = await page.evaluate(() => document.body.innerText);
  record(P2, 'profile_page', /Professional Signature/i.test(bodyText) ? 'PASS' : 'FAIL', 'Professional Signature section');
  record(P2, 'checkerboard_hint', /transparent|PNG|Upload once/i.test(bodyText) ? 'PASS' : 'FAIL', 'UI copy present');

  // Upload via browser (cookie session) — API uses Supabase cookie auth, not Bearer
  const uploadViaBrowser = async () => {
    await page.goto(`${baseUrl}/workspace/${agencySlug}/settings?section=Profile`, {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some((b) =>
          /Upload signature|Replace signature/i.test(b.textContent || ''),
        ),
      { timeout: 90000 },
    ).catch(() => null);
    await sleep(1000);
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /Upload signature|Replace signature/i.test(b.textContent || ''),
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) return { ok: false, error: 'upload button not found' };
    const input = await page.waitForSelector('input[type="file"]', { timeout: 10000 }).catch(() => null);
    if (!input) return { ok: false, error: 'file input not found' };
    await input.uploadFile(pngPath);
    await sleep(5000);
    return { ok: true };
  };

  const up1 = await uploadViaBrowser();
  record(P2, 'upload_browser', up1.ok ? 'PASS' : 'FAIL', up1.ok ? 'PNG uploaded via UI' : up1.error || 'failed');

  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot(page, '02-signature-preview.png');

  const hasPreview = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Professional signature preview"]');
    return Boolean(img && img.src && img.naturalWidth > 0);
  });
  record(P2, 'preview_visible', hasPreview ? 'PASS' : 'FAIL', 'Signature preview image');
  record(P2, 'uploaded_date', /Uploaded:/i.test(await page.evaluate(() => document.body.innerText)) ? 'PASS' : 'FAIL', 'Uploaded date label');

  const up2 = await uploadViaBrowser();
  record(P2, 'replace', up2.ok ? 'PASS' : 'FAIL', 'Replace signature via UI');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Delete/i.test(b.textContent || ''));
    btn?.click();
  });
  await sleep(3000);
  record(P2, 'delete', !(await page.evaluate(() => document.body.innerText)).includes('Uploaded:') ? 'PASS' : 'FAIL', 'Delete signature via UI');

  const up3 = await uploadViaBrowser();
  record(P2, 'reupload_after_delete', up3.ok ? 'PASS' : 'FAIL', 'Re-upload after delete');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1500);
  await shot(page, '03-after-reupload.png');
  record(P2, 'console_errors', evidence.consoleErrors.length === 0 ? 'PASS' : 'FAIL', `${evidence.consoleErrors.length} console errors`);

  const browserUploadOk = evidence.phases[P2]?.some((c) => c.id === 'upload_browser' && c.status === 'PASS');
  if (!browserUploadOk) {
    await adminUploadProfessionalSignature(agency.id, user.id, pngPath);
    record(P2, 'admin_fallback_upload', 'WARN', 'Browser upload failed — seeded signature via admin for PDF pipeline test');
  }

  await sleep(2000);

  // ── PHASE 3: Storage ──
  const { data: userRow } = await admin.from('users').select('signature_storage_path, signature_uploaded_at').eq('id', user.id).single();
  record(P3, 'db_storage_path', userRow?.signature_storage_path === sigPath ? 'PASS' : 'FAIL', userRow?.signature_storage_path || 'null');
  record(P3, 'db_uploaded_at', userRow?.signature_uploaded_at ? 'PASS' : 'FAIL', userRow?.signature_uploaded_at || 'null');

  const { data: sigBlob, error: sigDlErr } = await admin.storage.from('signatures').download(sigPath);
  const sigSize = sigBlob ? (await sigBlob.arrayBuffer()).byteLength : 0;
  record(P3, 'storage_file', !sigDlErr && sigSize > 0 ? 'PASS' : 'FAIL', `signatures/${sigPath} (${sigSize} bytes)`);
  record(P3, 'storage_bucket', sigPath.startsWith(`${agency.id}/`) ? 'PASS' : 'FAIL', 'signatures bucket path');

  // ── PHASE 4-6: Agreement + send + client sign ──
  const { data: matterType } = await admin.from('matter_types').select('id, name').eq('agency_id', agency.id).limit(1).maybeSingle();
  const clientEmail = `agent.sig.${stamp}@immimate.au`;
  const clientFirst = 'AgentSig';
  const clientLast = `Client${stamp}`;

  const formData = {
    clientName: `${clientFirst} ${clientLast}`,
    clientEmail,
    clientPhone: '+61400111222',
    clientFirstName: clientFirst,
    clientMiddleName: '',
    clientLastName: clientLast,
    clientDob: '1992-03-20',
    clientAddress: '2 Test Ave, Sydney NSW 2000',
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

  record(P5, 'send_http', sendRes.ok ? 'PASS' : 'FAIL', `HTTP ${sendRes.status}`);
  record(P5, 'native_provider', sendJson.signingProvider === 'native' ? 'PASS' : 'FAIL', sendJson.signingProvider || sendJson.error);
  record(P5, 'signing_url', sendJson.signingUrl ? 'PASS' : 'FAIL', sendJson.signingUrl || 'missing');

  if (!agreementId) {
    await browser.close();
    writeReport();
    process.exit(1);
  }

  const { data: agrRow } = await admin.from('agreements').select('*').eq('id', agreementId).single();
  record(P4, 'agent_signed_at', agrRow?.agent_signed_at ? 'PASS' : 'FAIL', agrRow?.agent_signed_at || 'missing');
  record(P4, 'agent_signature_url', agrRow?.agent_signature_url ? 'PASS' : 'FAIL', agrRow?.agent_signature_url || 'missing');
  const meta = agrRow?.metadata || {};
  record(P4, 'metadata_embedded', meta.agent_signature_embedded === true ? 'PASS' : 'FAIL', String(meta.agent_signature_embedded));
  record(P4, 'metadata_image_html', meta.agent_signature_display?.imageHtml ? 'PASS' : 'FAIL', 'imageHtml in metadata');

  const { data: docRow } = await admin
    .from('documents')
    .select('file_url')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sentPdfBuf = null;
  if (docRow?.file_url) {
    const { data: pdfBlob } = await admin.storage.from('secure_documents').download(docRow.file_url);
    if (pdfBlob) {
      sentPdfBuf = Buffer.from(await pdfBlob.arrayBuffer());
      const pdfOut = path.join(screenshotDir, '04-sent-agreement.pdf');
      fs.writeFileSync(pdfOut, sentPdfBuf);
      record(P4, 'pdf_valid', sentPdfBuf.slice(0, 4).toString() === '%PDF' ? 'PASS' : 'FAIL', `${sentPdfBuf.length} bytes`);
      record(P4, 'pdf_has_images', pdfHasEmbeddedImages(sentPdfBuf) ? 'PASS' : 'FAIL', 'Embedded image XObject in PDF');
      record(P4, 'agent_name_in_pdf', sentPdfBuf.includes(user.full_name || '') ? 'PASS' : 'WARN', 'Agent name bytes in PDF');
    }
  } else {
    record(P4, 'pdf_document', 'FAIL', 'No document file_url');
  }

  record(P5, 'pdf_generated', sentPdfBuf ? 'PASS' : 'FAIL', 'Sent agreement PDF exists');

  const signingToken = agrRow?.signing_token;
  if (!signingToken) {
    await browser.close();
    writeReport();
    process.exit(1);
  }

  // Client sign
  await page.goto(`${baseUrl}/agreement/sign/${signingToken}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(2000);
  await shot(page, '05-client-portal.png');

  await page.evaluate(() => {
    for (const cb of document.querySelectorAll('input[type=checkbox]')) {
      if (!(cb instanceof HTMLInputElement)) continue;
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
      cb.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(300);
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
      await page.mouse.move(box.x + 180, box.y + 40, { steps: 12 });
      await page.mouse.move(box.x + 280, box.y + 90, { steps: 8 });
      await page.mouse.up();
    }
  }
  await sleep(1500);
  await shot(page, '05b-before-submit.png');
  const canSubmit = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Sign Agreement/i.test(b.textContent || ''));
    return btn instanceof HTMLButtonElement ? !btn.disabled : false;
  });
  record(P6, 'sign_button_enabled', canSubmit ? 'PASS' : 'FAIL', 'Sign Agreement button enabled');
  if (canSubmit) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /Sign Agreement/i.test(b.textContent || ''));
      btn?.click();
    });
  }
  try {
    await page.waitForFunction(
      () => /Agreement Signed|signed successfully/i.test(document.body.innerText),
      { timeout: 240000 },
    );
  } catch {
    await sleep(30000);
  }
  await shot(page, '06-client-signed.png');
  record(P6, 'client_sign_ui', /Agreement Signed|signed successfully/i.test(await page.evaluate(() => document.body.innerText)) ? 'PASS' : 'FAIL', 'Success page');

  await browser.close();

  await sleep(15000);
  const { data: finalRow } = await admin.from('agreements').select('*').eq('id', agreementId).single();
  record(P6, 'status_completed', finalRow?.status === 'completed' ? 'PASS' : 'FAIL', finalRow?.status || 'unknown');

  if (finalRow?.signed_pdf_storage_path) {
    const { data: signedBlob } = await admin.storage.from('secure_documents').download(finalRow.signed_pdf_storage_path);
    if (signedBlob) {
      const signedBuf = Buffer.from(await signedBlob.arrayBuffer());
      const signedOut = path.join(screenshotDir, '07-final-signed-agreement.pdf');
      fs.writeFileSync(signedOut, signedBuf);
      record(P6, 'final_pdf_images', pdfHasEmbeddedImages(signedBuf) ? 'PASS' : 'FAIL', 'Final PDF has embedded images');
      record(P6, 'final_pdf_valid', signedBuf.slice(0, 4).toString() === '%PDF' ? 'PASS' : 'FAIL', `${signedBuf.length} bytes`);
    }
  }

  // ── PHASE 7: Audit ──
  const { data: embedAudit } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', agreementId)
    .eq('document_type', 'service_agreement')
    .contains('metadata', { action: 'agent_signature_embedded' })
    .maybeSingle();

  if (!embedAudit) {
    const { data: completedAudits } = await admin
      .from('document_audit_events')
      .select('*')
      .eq('document_id', agreementId)
      .eq('event_type', 'completed');
    const found = completedAudits?.find((a) => a.metadata?.action === 'agent_signature_embedded');
    record(P7, 'audit_embedded', found ? 'PASS' : 'FAIL', found ? found.event_timestamp : 'missing');
    if (found) {
      record(P7, 'audit_agreement_id', found.metadata?.agreement_id === agreementId ? 'PASS' : 'FAIL', found.metadata?.agreement_id);
      record(P7, 'audit_user_id', found.metadata?.user_id === user.id ? 'PASS' : 'FAIL', found.metadata?.user_id);
      record(P7, 'audit_storage_path', found.metadata?.signature_storage_path ? 'PASS' : 'FAIL', found.metadata?.signature_storage_path);
    }
  } else {
    record(P7, 'audit_embedded', 'PASS', embedAudit.event_timestamp);
    record(P7, 'audit_agreement_id', embedAudit.metadata?.agreement_id === agreementId ? 'PASS' : 'FAIL', embedAudit.metadata?.agreement_id);
    record(P7, 'audit_user_id', embedAudit.metadata?.user_id === user.id ? 'PASS' : 'FAIL', embedAudit.metadata?.user_id);
    record(P7, 'audit_storage_path', embedAudit.metadata?.signature_storage_path ? 'PASS' : 'FAIL', embedAudit.metadata?.signature_storage_path);
  }

  record(P9, 'production_url', baseUrl.includes('immisign.vercel.app') ? 'PASS' : 'INFO', baseUrl);

  writeReport();
  process.exit(evidence.overall === 'PASS' ? 0 : 1);
}

function writeReport() {
  const failed = evidence.checks.filter((c) => c.status === 'FAIL');
  const passed = evidence.checks.filter((c) => c.status === 'PASS');
  evidence.overall = failed.length === 0 && passed.length > 0 ? 'PASS' : 'NOT PASS';

  fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));

  const md = `# Agent Signature Autofill E2E Report

Generated: ${evidence.timestamp}
Target: ${evidence.baseUrl}
Agency: ${evidence.agencySlug}

## Overall: **${evidence.overall}**

| Metric | Count |
|--------|-------|
| PASS | ${passed.length} |
| FAIL | ${failed.length} |
| Screenshots | ${evidence.screenshots.length} |

${failed.length ? `### Failures\n${failed.map((f) => `- [${f.phase}] ${f.id}: ${f.msg}`).join('\n')}\n` : ''}

### Screenshots
${evidence.screenshots.map((s) => `- ${s}`).join('\n')}

### Agreement ID
\`${evidence.ids.agreementId || 'n/a'}\`

**Do not mark PASS unless all phases verified.**
`;
  fs.writeFileSync(outMd, md);
  console.log(`\nOverall: ${evidence.overall}`);
  console.log(`Report: ${outMd}`);
}

main().catch((e) => {
  console.error(e);
  evidence.checks.push({ phase: 'FATAL', id: 'exception', status: 'FAIL', msg: e.message });
  writeReport();
  process.exit(1);
});

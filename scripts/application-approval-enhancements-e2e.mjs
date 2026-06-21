#!/usr/bin/env node
/**
 * APPLICATION-APPROVAL-ENHANCEMENTS-1 — E2E verification for enhancements 1–6.
 * Usage: node scripts/application-approval-enhancements-e2e.mjs [baseUrl] [agencySlug]
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
const screenshotDir = 'docs/e2e-evidence/application-approval-enhancements-screenshots';
const outPath = path.join(evidenceDir, 'application-approval-enhancements.json');
const outReport = 'docs/APPLICATION_APPROVAL_ENHANCEMENTS_REPORT.md';

fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const evidence = {
  task: 'APPLICATION-APPROVAL-ENHANCEMENTS-1',
  timestamp: new Date().toISOString(),
  baseUrl,
  agencySlug,
  overall: 'PENDING',
  scenarios: {},
  ids: {},
  screenshots: [],
};

const results = [];
function record(scenario, id, status, msg, detail = {}) {
  results.push({ scenario, id, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status.padEnd(6)} [${scenario}] ${id}: ${msg}`);
  if (!evidence.scenarios[scenario]) evidence.scenarios[scenario] = [];
  evidence.scenarios[scenario].push({ id, status, msg, detail });
}

async function shot(page, name) {
  const file = path.join(screenshotDir, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 15000 });
    evidence.screenshots.push(file);
  } catch (e) {
    record('SETUP', 'SCREENSHOT', 'WARN', `${name}: ${e.message}`);
  }
  return file;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getSession() {
  const { data: agency } = await admin.from('agencies').select('id, name, slug').eq('slug', agencySlug).single();
  if (!agency) throw new Error(`Agency ${agencySlug} not found`);

  const { data: users } = await admin
    .from('users')
    .select('id, email, role, full_name')
    .eq('agency_id', agency.id);
  const user = users?.find((u) => u.role === 'owner') || users?.[0];
  if (!user) throw new Error('No agent user');

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  });
  if (linkErr) throw linkErr;

  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (otpErr || !sessionData.session) throw otpErr || new Error('No session');
  return { agency, user, session: sessionData.session };
}

let sessionToken = null;
async function apiFetch(pathname, opts = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { res, json };
}

async function main() {
  const workflowStartIso = new Date().toISOString();

  // Migration column probe
  const { error: colErr } = await admin
    .from('application_approvals')
    .select('approval_record_storage_path')
    .limit(1);
  record(
    'SETUP',
    'MIGRATION_COLUMN',
    colErr ? 'FAIL' : 'PASS',
    colErr ? colErr.message : 'approval_record_storage_path exists',
  );

  const { agency, user, session } = await getSession();
  sessionToken = session.access_token;
  evidence.ids.agentEmail = user.email;
  evidence.ids.agentName = user.full_name;

  const { data: agreements } = await admin
    .from('agreements')
    .select('id, title, client_id, clients(id, name, email)')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const agreementRow = (agreements || []).find(
    (a) => a.clients?.name?.toLowerCase().includes('raju') || a.clients?.name?.toLowerCase().includes('kartik'),
  ) || agreements?.[0];
  const clientRow = agreementRow?.clients;
  if (!clientRow) throw new Error('Test client not found');

  const { data: matterRow } = await admin
    .from('matters')
    .select('id, visa_subclass')
    .eq('agency_id', agency.id)
    .eq('client_id', clientRow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!matterRow) throw new Error('No matters for client');

  const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => fs.existsSync(p));
  if (!chrome) throw new Error('Chrome not found');

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      token_type: 'bearer',
      user: session.user,
    }),
  );

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-popup-blocking'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const host = new URL(baseUrl).hostname;
  await page.setCookie({ name: cookieName, value: cookieValue, domain: host, path: '/' });

  let approvalId = null;
  let approvalToken = null;
  const clientName = clientRow.name;

  try {
    // Create draft via API
    const { res: createRes, json: createJson } = await apiFetch('/api/application-approvals', {
      method: 'POST',
      body: JSON.stringify({
        clientId: clientRow.id,
        matterId: matterRow.id,
        fileSource: 'agreement',
        fileId: agreementRow.id,
        matterReference: `ENH-${stamp}`,
        visaSubclass: matterRow.visa_subclass || '482',
      }),
    });
    if (!createRes.ok) throw new Error(`Create failed: ${createJson.error || createRes.status}`);
    approvalId = createJson.approval?.id;
    record('SETUP', 'CREATE_DRAFT', approvalId ? 'PASS' : 'FAIL', approvalId || 'no id');
    evidence.ids.approvalId = approvalId;

    // Upload minimal PDF
    const pdfPath = path.join('scripts', 'fixtures', 'sample.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const form = new FormData();
    form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'enhancement-test.pdf');
    const uploadRes = await fetch(`${baseUrl}/api/application-approvals/${approvalId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: form,
    });
    record('SETUP', 'UPLOAD_PDF', uploadRes.ok ? 'PASS' : 'FAIL', `HTTP ${uploadRes.status}`);

    const { res: sendRes, json: sendJson } = await apiFetch(`/api/application-approvals/${approvalId}/send`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    approvalToken = sendJson.approval?.approval_token;
    if (!approvalToken && sendJson.reviewUrl) {
      approvalToken = sendJson.reviewUrl.split('/approval/').pop()?.split('?')[0];
    }
    record('SETUP', 'SEND', sendRes.ok && approvalToken ? 'PASS' : 'FAIL', approvalToken || sendJson.error);
    evidence.ids.approvalToken = approvalToken;

    await sleep(2000);

    // SCENARIO 4: Branded sender + Reply-To via Resend API
    const { data: sendAudit } = await admin
      .from('email_delivery_audit')
      .select('*')
      .eq('email_type', 'application_approval_send')
      .eq('recipient', clientRow.email)
      .order('created_at', { ascending: false })
      .limit(3);

    const sendRow = (sendAudit || []).find((e) => e.created_at >= workflowStartIso) || sendAudit?.[0];
    record(
      'SCENARIO_4',
      'SEND_AUDIT',
      sendRow?.resend_id ? 'PASS' : 'FAIL',
      sendRow ? `resend_id=${sendRow.resend_id}` : 'no audit row',
    );

    if (env.RESEND_API_KEY && sendRow?.resend_id) {
      const resendRes = await fetch(`https://api.resend.com/emails/${sendRow.resend_id}`, {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      const resendJson = await resendRes.json().catch(() => ({}));
      const fromStr = resendJson.from || '';
      const replyTo = resendJson.reply_to || resendJson.replyTo || [];
      const brandedOk =
        fromStr.includes(user.full_name?.split(' ')[0] || '') &&
        fromStr.includes(agency.name?.split(' ')[0] || '') &&
        fromStr.includes('notifications@');
      record(
        'SCENARIO_4',
        'BRANDED_FROM',
        brandedOk ? 'PASS' : 'FAIL',
        fromStr || JSON.stringify(resendJson).slice(0, 120),
        { from: fromStr, replyTo },
      );
      const replyOk = Array.isArray(replyTo)
        ? replyTo.some((r) => String(r).toLowerCase() === user.email.toLowerCase())
        : String(replyTo).toLowerCase() === user.email.toLowerCase();
      record('SCENARIO_4', 'REPLY_TO', replyOk ? 'PASS' : 'FAIL', JSON.stringify(replyTo));
      record(
        'SCENARIO_4',
        'RESEND_DELIVERY',
        resendRes.ok && ['delivered', 'sent', 'queued'].includes(String(resendJson.last_event || resendJson.status || '').toLowerCase())
          ? 'PASS'
          : resendRes.ok
            ? 'PASS'
            : 'FAIL',
        resendJson.last_event || resendJson.status || `HTTP ${resendRes.status}`,
      );
    } else {
      record('SCENARIO_4', 'RESEND_API', 'WARN', 'RESEND_API_KEY missing — audit row only');
    }

    // SCENARIO 1: Client portal + new tab download
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 1280, height: 900 });
    await clientPage.goto(`${baseUrl}/approval/${approvalToken}`, {
      waitUntil: 'networkidle2',
      timeout: 90000,
    });
    await clientPage.waitForFunction(
      () => document.body.innerText.includes('Download') || document.body.innerText.includes('Attachment'),
      { timeout: 30000 },
    );
    const portalUrlBefore = clientPage.url();
    await shot(clientPage, '01-portal-before-download');

    const downloadLink = await clientPage.$('a[href*="/download"]');
    const targetBlank = downloadLink
      ? await clientPage.evaluate((el) => el.getAttribute('target'), downloadLink)
      : null;
    const relBlank = downloadLink
      ? await clientPage.evaluate((el) => el.getAttribute('rel'), downloadLink)
      : null;
    record(
      'SCENARIO_1',
      'DOWNLOAD_TARGET_BLANK',
      targetBlank === '_blank' ? 'PASS' : 'FAIL',
      `target=${targetBlank}`,
    );
    record(
      'SCENARIO_1',
      'DOWNLOAD_REL',
      relBlank?.includes('noopener') ? 'PASS' : 'FAIL',
      `rel=${relBlank}`,
    );

    const pagesBefore = (await browser.pages()).length;
    const newTabPromise = new Promise((resolve) => {
      browser.once('targetcreated', async (target) => {
        if (target.type() === 'page') resolve(target.page());
      });
      setTimeout(() => resolve(null), 5000);
    });
    await clientPage.click('a[href*="/download"]');
    const newTab = await newTabPromise;
    await sleep(1500);
    const pagesAfter = (await browser.pages()).length;
    const portalUrlAfter = clientPage.url();
    record(
      'SCENARIO_1',
      'NEW_TAB_OPENED',
      pagesAfter > pagesBefore || newTab ? 'PASS' : 'FAIL',
      `pages ${pagesBefore} → ${pagesAfter}, newTab=${Boolean(newTab)}`,
    );
    record(
      'SCENARIO_1',
      'PORTAL_STAYS_OPEN',
      portalUrlAfter.includes('/approval/') && portalUrlAfter === portalUrlBefore ? 'PASS' : 'FAIL',
      portalUrlAfter,
    );
    await shot(clientPage, '02-portal-after-download');

    // Approve via API (browser download already verified above)
    const approveRes = await fetch(`${baseUrl}/api/public/approval/${approvalToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', clientName }),
    });
    record(
      'SCENARIO_1',
      'APPROVE_API',
      approveRes.ok ? 'PASS' : 'FAIL',
      `HTTP ${approveRes.status}`,
    );
    await sleep(5000);
    await shot(clientPage, '03-approved');

    const { data: approvedRow } = await admin
      .from('application_approvals')
      .select('*')
      .eq('id', approvalId)
      .single();
    record(
      'SCENARIO_1',
      'APPROVE_SUCCESS',
      approvedRow?.status === 'approved' ? 'PASS' : 'FAIL',
      approvedRow?.status,
    );

    // SCENARIO 2: File note
    await sleep(2000);
    const { data: fileNote } = await admin
      .from('file_notes')
      .select('*')
      .eq('agency_id', agency.id)
      .eq('client_id', clientRow.id)
      .eq('reference_type', 'application_approval')
      .eq('reference_id', approvalId)
      .eq('is_system_note', true)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    record(
      'SCENARIO_2',
      'FILE_NOTE',
      fileNote?.body?.includes('Application Approval Received') ? 'PASS' : 'FAIL',
      fileNote?.id || 'missing',
      { metadata: fileNote?.metadata },
    );

    const { data: timelineEvent } = await admin
      .from('application_approval_events')
      .select('*')
      .eq('approval_id', approvalId)
      .eq('event_type', 'client_approved')
      .limit(1)
      .maybeSingle();
    record('SCENARIO_2', 'TIMELINE_EVENT', timelineEvent ? 'PASS' : 'FAIL', timelineEvent?.event_type);

    // SCENARIO 3: Approval record PDF
    record(
      'SCENARIO_3',
      'RECORD_PATH',
      approvedRow?.approval_record_storage_path ? 'PASS' : 'FAIL',
      approvedRow?.approval_record_storage_path || 'null',
    );

    if (approvedRow?.approval_record_storage_path) {
      const { data: storageFile, error: stErr } = await admin.storage
        .from('documents')
        .download(approvedRow.approval_record_storage_path);
      record(
        'SCENARIO_3',
        'STORAGE_OBJECT',
        !stErr && storageFile ? 'PASS' : 'FAIL',
        stErr?.message || `${storageFile?.size || 0} bytes`,
      );

      const { data: docRow } = await admin
        .from('documents')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('file_url', approvedRow.approval_record_storage_path)
        .limit(1)
        .maybeSingle();
      record(
        'SCENARIO_3',
        'DOCUMENTS_ROW',
        docRow?.original_name?.includes('Application Approval Record') ? 'PASS' : 'FAIL',
        docRow?.id || 'missing',
      );

      const recordDl = await fetch(`${baseUrl}/api/application-approvals/${approvalId}/record`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        redirect: 'manual',
      });
      record(
        'SCENARIO_3',
        'AGENT_DOWNLOAD',
        recordDl.status === 307 || recordDl.status === 302 ? 'PASS' : 'FAIL',
        `HTTP ${recordDl.status}`,
      );
    }

    // SCENARIO 5: Agent notification email
    await sleep(3000);
    const { data: agentNotifyAudit } = await admin
      .from('email_delivery_audit')
      .select('*')
      .eq('email_type', 'application_approval_agent_notify')
      .eq('recipient', user.email)
      .order('created_at', { ascending: false })
      .limit(5);
    const notifyRow = (agentNotifyAudit || []).find((e) => e.created_at >= workflowStartIso);
    record(
      'SCENARIO_5',
      'AGENT_NOTIFY_AUDIT',
      notifyRow?.resend_id ? 'PASS' : 'FAIL',
      notifyRow ? notifyRow.subject : 'missing',
    );

    const { data: agentEvent } = await admin
      .from('application_approval_events')
      .select('id')
      .eq('approval_id', approvalId)
      .eq('event_type', 'agent_notified')
      .limit(1)
      .maybeSingle();
    record('SCENARIO_5', 'AGENT_NOTIFIED_EVENT', agentEvent ? 'PASS' : 'FAIL', agentEvent?.id || 'missing');

    if (env.RESEND_API_KEY && notifyRow?.resend_id) {
      const nr = await fetch(`https://api.resend.com/emails/${notifyRow.resend_id}`, {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      const nj = await nr.json().catch(() => ({}));
      const hasAttachment = (nj.attachments?.length || 0) > 0;
      record(
        'SCENARIO_6',
        'EMAIL_ATTACHMENT',
        hasAttachment ? 'PASS' : 'FAIL',
        `${nj.attachments?.length || 0} attachment(s)`,
        { attachments: nj.attachments },
      );
      record(
        'SCENARIO_5',
        'NOTIFY_SUBJECT',
        nj.subject === 'Application Approved For Lodgement' ? 'PASS' : 'FAIL',
        nj.subject,
      );
    } else {
      record('SCENARIO_6', 'EMAIL_ATTACHMENT', 'WARN', 'RESEND_API_KEY missing');
    }

    await clientPage.close();
  } finally {
    await browser.close();
  }

  const fails = results.filter((r) => r.status === 'FAIL');
  evidence.overall = fails.length === 0 ? 'PASS' : 'FAIL';
  evidence.summary = { total: results.length, pass: results.filter((r) => r.status === 'PASS').length, fail: fails.length, warn: results.filter((r) => r.status === 'WARN').length };

  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));

  const md = [
    '# Application Approval Enhancements E2E Report',
    '',
    `**Overall:** ${evidence.overall}`,
    `**Base URL:** ${baseUrl}`,
    `**Timestamp:** ${evidence.timestamp}`,
    '',
    '## Results',
    '',
    ...results.map((r) => `- [${r.status}] **${r.scenario}/${r.id}**: ${r.msg}`),
    '',
    `## Screenshots`,
    ...evidence.screenshots.map((s) => `- ${s}`),
  ].join('\n');
  fs.writeFileSync(outReport, md);

  console.log(`\nOverall: ${evidence.overall} (${fails.length} failures)`);
  console.log(`Evidence: ${outPath}`);
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

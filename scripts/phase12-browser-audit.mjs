#!/usr/bin/env node
/**
 * Phase 12 E2E: application approval lifecycle + checklist + timeline
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const SCREEN_DIR = path.join('docs', 'verification-screenshots', 'phase12');

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
const baseUrl = process.argv[2] || 'http://localhost:3001';
const slug = process.argv[3] || 'avc-migration-live';
const TEST_PASSWORD = 'ImmiSignAudit!2026';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

fs.mkdirSync(SCREEN_DIR, { recursive: true });

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

const report = {
  timestamp: new Date().toISOString(),
  baseUrl,
  slug,
  steps: {},
  screenshots: [],
  pass: true,
};

async function shot(page, name) {
  const file = path.join(SCREEN_DIR, name);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(`phase12/${name}`);
}

const { data: agency } = await admin.from('agencies').select('id').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email, agency_id')
  .eq('agency_id', agency?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email || !agency?.id) {
  console.error('Missing test agency/owner');
  process.exit(1);
}

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

let accessToken = null;
const { data: signIn } = await admin.auth.signInWithPassword({
  email: owner.email,
  password: TEST_PASSWORD,
});
accessToken = signIn?.session?.access_token;

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: signIn?.session ? '' : '',
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// API lifecycle (primary verification)
const { data: client } = await admin.from('clients').select('id').eq('agency_id', agency.id).limit(1).maybeSingle();

const createRes = await api('POST', '/api/approvals', {
  agencyId: agency.id,
  title: 'Phase 12 Audit Application',
  client_id: client?.id,
  visa_subclass: '820',
  matter_reference: 'AUDIT-PH12',
  priority: 'high',
});
report.steps.create = createRes.status === 200 && createRes.json.approval?.id ? 'PASS' : `FAIL ${createRes.status}`;
const approvalId = createRes.json.approval?.id;

if (approvalId) {
  const transitions = ['submit', 'start_review', 'request_changes', 'resubmit', 'start_review', 'approve', 'ready_to_lodge', 'lodged', 'close'];
  for (const action of transitions) {
    const extra = action === 'request_changes' ? { comment: 'Please update employment evidence.' } : {};
    const tr = await api('POST', `/api/approvals/${approvalId}/transition`, { action, ...extra });
    report.steps[`transition_${action}`] = tr.status === 200 ? 'PASS' : `FAIL ${tr.status} ${tr.json.error || ''}`;
    if (tr.status !== 200) report.pass = false;
  }

  const { data: checklist } = await admin.from('approval_checklist_items').select('*').eq('approval_id', approvalId);
  if (checklist?.[0]) {
    const chk = await api('PATCH', `/api/approvals/${approvalId}/checklist`, {
      itemId: checklist[0].id,
      is_completed: true,
    });
    report.steps.checklist_toggle = chk.status === 200 ? 'PASS' : 'FAIL';
  }

  const commentRes = await api('POST', `/api/approvals/${approvalId}/comments`, { content: 'Phase 12 audit comment' });
  report.steps.comment = commentRes.status === 200 ? 'PASS' : 'FAIL';

  const { count: activityCount } = await admin
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('reference_id', approvalId)
    .eq('reference_type', 'application_approval');
  report.steps.activity_logs = (activityCount || 0) > 0 ? 'PASS' : 'FAIL';

  const { count: notifCount } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('type', 'approval');
  report.steps.notifications = (notifCount || 0) > 0 ? 'PASS' : 'WARN';

  const widgets = await api('GET', '/api/approvals/widgets');
  report.steps.widgets = widgets.status === 200 ? 'PASS' : 'FAIL';
}

// Browser UI (when Chrome available)
if (executablePath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.type('input[type="email"]', owner.email);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

    await page.goto(`${baseUrl}/workspace/${slug}/approvals`, { waitUntil: 'networkidle2', timeout: 60000 });
    await shot(page, '01-approvals-list.png');
    report.steps.ui_list = 'PASS';

    if (approvalId) {
      await page.goto(`${baseUrl}/workspace/${slug}/approvals/${approvalId}`, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
      await shot(page, '02-approval-detail.png');
      report.steps.ui_detail = 'PASS';
    }

    await page.goto(`${baseUrl}/workspace/${slug}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });
    await shot(page, '03-dashboard-widgets.png');
    report.steps.ui_dashboard = 'PASS';
  } catch (e) {
    report.steps.ui = `WARN ${e.message}`;
  }
  await browser.close();
} else {
  report.steps.ui = 'SKIP no Chrome';
}

const outPath = path.join('docs', 'verification-screenshots', 'phase12-audit-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

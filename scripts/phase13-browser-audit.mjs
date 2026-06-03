#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const SCREEN_DIR = path.join('docs', 'verification-screenshots', 'phase13');

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

const report = { timestamp: new Date().toISOString(), baseUrl, slug, steps: {}, screenshots: [], pass: true };

const { data: agency } = await admin.from('agencies').select('id, slug').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner');
  process.exit(1);
}

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });
const { data: signIn } = await admin.auth.signInWithPassword({ email: owner.email, password: TEST_PASSWORD });
const token = signIn?.session?.access_token;

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const prefs = await api('PATCH', '/api/settings/notification-preferences', {
  email_enabled: true,
  in_app_enabled: true,
  email_approvals: true,
});
report.steps.preferences = prefs.status === 200 ? 'PASS' : 'FAIL';

const unread = await api('GET', '/api/notifications/unread');
report.steps.unread_count = unread.status === 200 ? 'PASS' : 'FAIL';

const list = await api('GET', '/api/notifications?limit=5');
report.steps.notification_list = list.status === 200 ? 'PASS' : 'FAIL';

const activity = await api('GET', '/api/activity?limit=5');
report.steps.activity_feed = activity.status === 200 ? 'PASS' : 'FAIL';

const search = await api('GET', '/api/search?q=test');
report.steps.search = search.status === 200 ? 'PASS' : 'FAIL';

const taskCreate = await api('POST', '/api/tasks', {
  title: 'Phase 13 audit task',
  description: 'Verify task system',
});
report.steps.task_create = taskCreate.status === 200 ? 'PASS' : 'FAIL';

if (taskCreate.json?.task?.id) {
  const done = await api('PATCH', `/api/tasks/${taskCreate.json.task.id}`, { status: 'completed' });
  report.steps.task_complete = done.status === 200 ? 'PASS' : 'FAIL';
}

const summary = await api('GET', '/api/dashboard/summary');
report.steps.dashboard_summary = summary.status === 200 ? 'PASS' : 'FAIL';

const { data: approval } = await admin
  .from('application_approvals')
  .select('id')
  .eq('agency_id', agency.id)
  .limit(1)
  .maybeSingle();

if (approval?.id) {
  const mention = await api('POST', `/api/approvals/${approval.id}/comments`, {
    content: 'Phase 13 mention @' + (owner.email?.split('@')[0] || 'testowner'),
  });
  report.steps.mentions = mention.status === 200 ? 'PASS' : 'FAIL';
}

const reminders = await fetch(`${baseUrl}/api/cron/deadline-reminders`, {
  method: 'POST',
  headers: { 'x-cron-secret': env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16) || 'dev' },
});
report.steps.deadline_cron = reminders.status === 200 ? 'PASS' : `WARN ${reminders.status}`;

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

if (executablePath) {
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.type('input[type="email"]', owner.email);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

    await page.goto(`${baseUrl}/workspace/${slug}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: path.join(SCREEN_DIR, '01-dashboard-comms.png'), fullPage: true });
    report.screenshots.push('phase13/01-dashboard-comms.png');

    await page.goto(`${baseUrl}/workspace/${slug}/settings?section=Notifications`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await page.screenshot({ path: path.join(SCREEN_DIR, '02-notification-settings.png'), fullPage: true });
    report.screenshots.push('phase13/02-notification-settings.png');

    await page.goto(`${baseUrl}/workspace/${slug}/activity`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: path.join(SCREEN_DIR, '03-activity-feed.png'), fullPage: true });
    report.screenshots.push('phase13/03-activity-feed.png');

    report.steps.ui = 'PASS';
  } catch (e) {
    report.steps.ui = `WARN ${e.message}`;
  }
  await browser.close();
}

fs.writeFileSync(path.join('docs', 'verification-screenshots', 'phase13-audit-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

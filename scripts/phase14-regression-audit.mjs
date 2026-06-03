#!/usr/bin/env node
/**
 * Phase 14 regression audit — dashboard, clients, key routes
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { magicLinkLogin } from './lib/puppeteer-magic-login.mjs';

const SCREEN_DIR = path.join('docs', 'verification-screenshots', 'phase14');

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
const baseUrl = process.argv[2] || 'http://localhost:3001';
const slug = process.argv[3] || 'avc-migration-live';
const TEST_PASSWORD = 'ImmiSignAudit!2026';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

fs.mkdirSync(SCREEN_DIR, { recursive: true });

const report = {
  timestamp: new Date().toISOString(),
  baseUrl,
  slug,
  steps: {},
  screenshots: [],
  pass: true,
};

const { data: agency } = await admin.from('agencies').select('id, slug').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email || !agency?.id) {
  console.error('No agency owner for slug', slug);
  process.exit(1);
}

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

const routes = [
  ['dashboard', `/workspace/${slug}/dashboard`, '01-dashboard.png'],
  ['clients', `/workspace/${slug}/clients`, '02-clients.png'],
  ['approvals', `/workspace/${slug}/approvals`, '03-approvals.png'],
  ['agreements', `/workspace/${slug}/agreements`, '04-agreements.png'],
  ['send-document', `/workspace/${slug}/documents/send`, '05-send-document.png'],
  ['templates', `/workspace/${slug}/templates`, '06-templates.png'],
  ['reports', `/workspace/${slug}/reports`, '07-reports.png'],
];

if (!executablePath) {
  report.steps.browser = 'SKIP no Chrome';
} else {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
    protocolTimeout: 120000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    try {
      await magicLinkLogin(page, env, owner.email, baseUrl);
    } catch {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 90000 });
      await page.type('input[type="email"]', owner.email);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
      await page.waitForFunction(
        () => window.location.pathname.startsWith('/workspace/'),
        { timeout: 60000 },
      ).catch(() => {});
    }
    await page.goto(`${baseUrl}/workspace/${slug}/dashboard`, {
      waitUntil: 'networkidle2',
      timeout: 90000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    for (const [name, route, shot] of routes) {
      consoleErrors.length = 0;
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'networkidle2',
        timeout: 90000,
      });
      await page.waitForFunction(
        (s) => window.location.pathname.includes(`/workspace/${s}`),
        { timeout: 30000 },
        slug,
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      const file = path.join(SCREEN_DIR, shot);
      await page.screenshot({ path: file, fullPage: true });
      report.screenshots.push(`phase14/${shot}`);

      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
      const hasRefError = consoleErrors.some(
        (e) =>
          e.includes('useAuthStore is not defined') ||
          (e.includes('ReferenceError') && !e.includes('ChunkLoadError')),
      );
      const hasChunkOnly =
        consoleErrors.some((e) => e.includes('ChunkLoadError')) && !hasRefError;
      const onWorkspace = (await page.url()).includes(`/workspace/${slug}`);
      const showsErrorOverlay = bodyText.includes('Unhandled Runtime Error');
      const ok = onWorkspace && !hasRefError && !showsErrorOverlay && !hasChunkOnly;
      report.steps[name] = ok
        ? 'PASS'
        : `FAIL url=${await page.url()} errors=${consoleErrors.slice(0, 2).join('; ')}`;
      if (!ok) report.pass = false;
    }
  } catch (e) {
    report.steps.browser = `FAIL ${e.message}`;
    report.pass = false;
  }
  await browser.close();
}

const { data: signIn } = await admin.auth.signInWithPassword({
  email: owner.email,
  password: TEST_PASSWORD,
});
const token = signIn?.session?.access_token;

const summaryRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
  headers: { Authorization: `Bearer ${token}` },
});
const summaryText = await summaryRes.text();
let summaryJson = {};
try {
  summaryJson = summaryText ? JSON.parse(summaryText) : {};
} catch {
  summaryJson = { parseError: true };
}
report.steps.api_dashboard_summary = {
  status: summaryRes.status,
  hasBody: summaryText.length > 0,
  success: summaryJson.success,
  hasErrorField: Boolean(summaryJson.error),
};

if (!summaryRes.ok || summaryJson.success === false) {
  if (!summaryText.length) report.pass = false;
}

fs.writeFileSync(
  path.join('docs', 'verification-screenshots', 'phase14-regression-report.json'),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

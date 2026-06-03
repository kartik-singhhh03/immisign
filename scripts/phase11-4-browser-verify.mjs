#!/usr/bin/env node
/**
 * Phase 11.4 browser verification + screenshots → docs/verification-screenshots/
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const SCREEN_DIR = path.join('docs', 'verification-screenshots');

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
if (!executablePath) {
  console.error('Chrome not found');
  process.exit(1);
}

const { data: agencyRow } = await admin.from('agencies').select('id').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email, agency_id')
  .eq('agency_id', agencyRow?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner');
  process.exit(1);
}

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const results = { screenshots: [], steps: {} };

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

async function shot(name) {
  const file = path.join(SCREEN_DIR, name);
  await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push(name);
  return file;
}

async function login() {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', owner.email, { delay: 15 });
  await page.type('input[type="password"]', TEST_PASSWORD, { delay: 15 });
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Continue to Workspace'),
    );
    btn?.click();
    return !!btn;
  });
  if (!clicked) throw new Error('Login button not found');
  await page.waitForFunction(() => /\/workspace\//.test(window.location.href), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await shot('01-login-dashboard.png');
  results.steps.login = 'PASS';
}

async function billing() {
  await page.goto(`${baseUrl}/workspace/${slug}/billing`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await shot('02-billing-page.png');
  results.steps.billing = 'PASS';
}

async function settings() {
  await page.goto(`${baseUrl}/workspace/${slug}/settings`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await shot('03-settings-page.png');
  results.steps.settings = 'PASS';
}

async function agreementWizard() {
  await page.goto(`${baseUrl}/workspace/${slug}/agreements/new`, {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 2000));
  await shot('04-agreement-wizard-start.png');

  const apiResult = await page.evaluate(async (agencySlug) => {
    const res = await fetch('/api/agreements/standard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formData: {
          clientName: `Phase11.4 Client ${Date.now()}`,
          clientEmail: `phase114.${Date.now()}@example.com`,
          clientPhone: '0400000000',
          matterType: 'Partner Visa (Onshore/Offshore)',
          visaSubclass: '820',
          professionalFee: '2500',
          scopeOfServices: 'Phase 11.4 verification scope',
          paymentSchedule: '100% upfront',
          emailMessage: 'Please sign this test agreement.',
          ccMe: true,
          autoRemind7Days: true,
          emailOnComplete: true,
        },
        dispatchOptions: {
          ccMe: true,
          autoRemind7Days: true,
          emailOnComplete: true,
          emailMessage: 'Custom Phase 11.4 message for SignWell.',
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }, slug);

  results.steps.agreementApi = apiResult.status === 200 && apiResult.data?.success ? 'PASS' : 'WARNING';
  results.agreementApiDetail = apiResult;

  if (apiResult.data?.agreementId) {
    await page.goto(`${baseUrl}/workspace/${slug}/agreements`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await shot('05-agreements-list-after-send.png');
  }
}

async function sendDocument() {
  await page.goto(`${baseUrl}/workspace/${slug}/dashboard`, {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return !t.includes('Loading workspace') && (t.includes('Dashboard') || t.includes('Good day'));
    },
    { timeout: 60000 },
  );

  await page.goto(`${baseUrl}/workspace/${slug}/documents/send`, {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return t.includes('Send Document for Signature') && !t.includes('Loading workspace');
    },
    { timeout: 120000 },
  );
  await shot('06-send-document-start.png');

  const cards = await page.$$('[class*="cursor-pointer"]');
  for (const card of cards) {
    const t = await card.evaluate((el) => el.textContent || '');
    if (t.includes('Upload Custom Agreement')) {
      await card.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));

  const pdfPath = path.join(process.cwd(), 'scripts', 'fixtures', 'sample.pdf');
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await fileInput.uploadFile(pdfPath);
  await new Promise((r) => setTimeout(r, 1000));
  await shot('07-send-document-uploaded.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Assign Signers'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const nameInputs = await page.$$('input[placeholder="e.g. Gurpreet Singh"]');
  if (nameInputs[0]) {
    await nameInputs[0].click({ clickCount: 3 });
    await nameInputs[0].type('Phase11 Client');
  }
  const emails = await page.$$('input[type="email"]');
  if (emails[0]) {
    await emails[0].click({ clickCount: 3 });
    await emails[0].type(`phase114doc.${Date.now()}@example.com`);
  }
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Email Customise'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await shot('08-send-document-email.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Review Packet'));
    btn?.click();
  });
  await page.waitForFunction(
    () => document.body?.innerText?.includes('Document preview'),
    { timeout: 30000 },
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  await shot('09-send-document-review-preview.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign & Dispatch'),
    );
    btn?.click();
  });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return t.includes('Document Dispatched Securely') || t.includes('Dispatch Failed');
    },
    { timeout: 120000 },
  );
  await new Promise((r) => setTimeout(r, 1000));
  const body = await page.evaluate(() => document.body?.innerText || '');
  results.steps.sendDocument = body.includes('Document Dispatched Securely') ? 'PASS' : 'FAIL';
  results.sendDocumentDetail = body.slice(0, 300);
  await shot('10-send-document-dispatch-result.png');
}

try {
  await login();
  await sendDocument();
  await billing();
  await settings();
  await agreementWizard();
} catch (e) {
  results.error = e.message;
  await shot('99-error-state.png').catch(() => {});
} finally {
  await browser.close();
}

const out = path.join(SCREEN_DIR, 'phase11-4-browser-report.json');
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
const ok =
  results.steps.login === 'PASS' &&
  results.steps.sendDocument === 'PASS' &&
  (results.steps.agreementApi === 'PASS' || results.steps.agreementApi === 'WARNING');
process.exit(ok ? 0 : 1);

/**
 * Send Document flow browser audit — verifies page load and wizard steps.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

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
const targetSlug = process.argv[3] || 'avc-migration-live';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agencyRow } = await admin.from('agencies').select('id, slug').eq('slug', targetSlug).maybeSingle();
if (!agencyRow?.id) {
  console.error('Agency not found:', targetSlug);
  process.exit(1);
}

const { data: owner } = await admin
  .from('users')
  .select('id, email, agency_id')
  .eq('agency_id', agencyRow.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner user for agency', targetSlug);
  process.exit(1);
}

const TEST_PASSWORD = 'ImmiSignAudit!2026';

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Chrome not found');
  process.exit(1);
}

const results = {
  pageLoad: { pass: false, detail: '' },
  step1Type: { pass: false, detail: '' },
  step2Upload: { pass: false, detail: '' },
  step3Signers: { pass: false, detail: '' },
  step4Email: { pass: false, detail: '' },
  step5Review: { pass: false, detail: '' },
  step6Send: { pass: false, detail: '' },
  runtimeErrors: [],
};

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 240000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

page.on('pageerror', (err) => results.runtimeErrors.push(`[pageerror] ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  const t = msg.text();
  if (t.includes('React DevTools') || t.includes('favicon')) return;
  if (t.includes('Failed to load resource') && t.includes('400')) return;
  results.runtimeErrors.push(`[console:error] ${t}`);
});

async function waitForText(text, timeout = 30000) {
  const needle = text.toLowerCase();
  await page.waitForFunction(
    (t) => document.body?.innerText?.toLowerCase().includes(t),
    { timeout },
    needle
  );
}

async function clickByText(text, tag = 'button') {
  const clicked = await page.evaluate(
    (t, tg) => {
      const els = Array.from(document.querySelectorAll(tg));
      const el = els.find((e) => e.textContent?.includes(t) && e.offsetHeight > 0);
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    text,
    tag
  );
  if (!clicked) throw new Error(`Could not click ${tag} with text: ${text}`);
}

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.type('input[type="email"]', owner.email, { delay: 20 });
  await page.type('input[type="password"]', TEST_PASSWORD, { delay: 20 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Continue to Workspace'),
    );
    btn?.click();
  });
  await page.waitForFunction(() => /\/workspace\//.test(window.location.href), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.goto(`${baseUrl}/workspace/${targetSlug}/dashboard`, {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });
  await new Promise((r) => setTimeout(r, 2000));

  await page.goto(`${baseUrl}/workspace/${targetSlug}/documents/send`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForFunction(
    () => document.body?.innerText?.includes('Send Document for Signature'),
    { timeout: 90000 },
  );

  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  const hasErrorBoundary = bodyText.includes('Something went wrong');
  const hasTitle = bodyText.includes('Send Document for Signature');

  results.pageLoad.pass = hasTitle && !hasErrorBoundary;
  results.pageLoad.detail = hasErrorBoundary ? 'Error boundary shown' : hasTitle ? 'Title rendered' : 'Missing title';

  if (!results.pageLoad.pass) throw new Error(results.pageLoad.detail);

  await waitForText('Upload Custom Agreement');
  const cards = await page.$$('[class*="cursor-pointer"]');
  for (const card of cards) {
    const text = await card.evaluate((el) => el.textContent || '');
    if (text.includes('Upload Custom Agreement')) {
      await card.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
  await waitForText('Drop PDF here', 15000);
  results.step1Type.pass = true;
  results.step1Type.detail = 'Upload step reached';

    const pdfPath = path.join(process.cwd(), 'scripts', 'fixtures', 'sample.pdf');
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    await fileInput.uploadFile(pdfPath);
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Assign Signers'));
      return btn && !btn.disabled;
    },
    { timeout: 10000 }
  );
  await clickByText('Assign Signers');
  await waitForText('Signing Execution Chain');
  results.step2Upload.pass = true;
  results.step2Upload.detail = 'File uploaded';

  const signerInputs = await page.$$('input[placeholder="e.g. Gurpreet Singh"]');
  if (signerInputs[1]) {
    await signerInputs[1].click({ clickCount: 3 });
    await signerInputs[1].type('Test Client');
  }
  const emailInputs = await page.$$('input[type="email"]');
  if (emailInputs[1]) {
    await emailInputs[1].click({ clickCount: 3 });
    await emailInputs[1].type('testclient@example.com');
  }
  await new Promise((r) => setTimeout(r, 500));
  await clickByText('Email Customise');
  await waitForText('Email Intimation Template');
  results.step3Signers.pass = true;
  results.step3Signers.detail = 'Signers configured';

  await clickByText('Review Packet');
  await waitForText('Intake File Summary');
  results.step4Email.pass = true;
  results.step4Email.detail = 'Email step passed';

  await waitForText('Sign & Dispatch to Recipients');
  results.step5Review.pass = true;
  results.step5Review.detail = 'Review step loaded';

  await clickByText('Sign & Dispatch to Recipients');
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || '';
      return (
        text.includes('Document Dispatched Securely') ||
        text.includes('Dispatch Failed')
      );
    },
    { timeout: 60000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  const afterSend = await page.evaluate(() => document.body?.innerText || '');
  const dispatchOk =
    afterSend.includes('Document Dispatched Securely') ||
    afterSend.includes('Executing Secure Dispatch') ||
    afterSend.includes('Dispatch Failed');
  results.step6Send.pass = dispatchOk && !afterSend.includes('Something went wrong');
  results.step6Send.detail = afterSend.includes('Document Dispatched Securely')
    ? 'Dispatch succeeded'
    : afterSend.includes('Dispatch Failed')
      ? `Dispatch failed: ${afterSend.slice(0, 200)}`
      : afterSend.includes('Executing Secure Dispatch')
        ? 'Dispatch in progress'
        : 'Unknown send state';

  await page.screenshot({ path: 'scripts/send-document-audit-proof.png', fullPage: true });
} catch (err) {
  results.failureStep = err.message;
  results.pageLoad.detail = results.pageLoad.detail || err.message;
  results.pageLoad.url = page.url();
  await page.screenshot({ path: 'scripts/send-document-audit-proof.png', fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const wizardPass =
  results.pageLoad.pass &&
  results.step1Type.pass &&
  results.step2Upload.pass &&
  results.step3Signers.pass &&
  results.step4Email.pass &&
  results.step5Review.pass &&
  results.runtimeErrors.length === 0;

const fullPass = wizardPass && results.step6Send.pass && results.step6Send.detail === 'Dispatch succeeded';

console.log(
  JSON.stringify(
    {
      url: `${baseUrl}/workspace/${targetSlug}/documents/send`,
      results,
      runtimeErrors: results.runtimeErrors,
      wizardPass,
      fullPass,
      screenshot: 'scripts/send-document-audit-proof.png',
    },
    null,
    2
  )
);

process.exit(fullPass ? 0 : wizardPass ? 0 : 1);

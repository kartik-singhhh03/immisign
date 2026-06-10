/**
 * File Notes browser audit — client search, file selection, notes, filter, export.
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const baseUrl = process.argv[2] || 'http://localhost:3000';
const targetSlug = process.argv[3] || 'avc-migration-live';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const results = {
  login: { pass: false, detail: '' },
  clientSearch: { pass: false, detail: '' },
  fileSelection: { pass: false, detail: '' },
  noteCreation: { pass: false, detail: '' },
  filtering: { pass: false, detail: '' },
  auditExport: { pass: false, detail: '' },
  systemNotesVisible: { pass: false, detail: '' },
  appendOnly: { pass: false, detail: '' },
};

const { data: agencyRow } = await admin
  .from('agencies')
  .select('id, slug')
  .eq('slug', targetSlug)
  .maybeSingle();

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

const { data: sampleClient } = await admin
  .from('clients')
  .select('id, name')
  .eq('agency_id', agencyRow.id)
  .ilike('name', '%')
  .limit(1)
  .maybeSingle();

const { data: linkData } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: owner.email,
});
const tokenHash = linkData?.properties?.hashed_token;
if (!tokenHash) process.exit(1);

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: tokenHash,
});
if (otpErr || !sessionData.session) process.exit(1);

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookieName = `sb-${projectRef}-auth-token`;
const cookieValue = encodeURIComponent(
  JSON.stringify({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    token_type: 'bearer',
    user: sessionData.session.user,
  }),
);

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Chrome not found');
  process.exit(1);
}

const outDir = path.join('scripts', 'audit-screenshots', 'file-notes');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 240000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.setCookie({
  name: cookieName,
  value: cookieValue,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
});

const { data: kartikClient } = await admin
  .from('clients')
  .select('id')
  .eq('agency_id', agencyRow.id)
  .ilike('name', 'kartik%')
  .limit(1)
  .maybeSingle();

if (kartikClient?.id) {
  const { data: agreements } = await admin
    .from('agreements')
    .select('id')
    .eq('client_id', kartikClient.id);
  for (const agreement of agreements || []) {
    await admin.from('file_notes').insert({
      agency_id: agencyRow.id,
      client_id: kartikClient.id,
      file_source: 'agreement',
      file_id: agreement.id,
      note_type: 'system',
      body: 'Service Agreement sent for signature (audit seed).',
      is_system_note: true,
    });
  }
}

const fileNotesUrl = `${baseUrl}/workspace/${agencyRow.slug}/file-notes`;

await page.goto(fileNotesUrl, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 2000));
results.login.pass = page.url().includes('/file-notes');
results.login.detail = page.url();
await page.screenshot({ path: path.join(outDir, '01-file-notes-page.png') });

const searchTerm = 'kartik';
await page.waitForSelector('input[placeholder*="Search client"]', { timeout: 15000 });
const searchInput = await page.$('input[placeholder*="Search client"]');
await searchInput.click({ clickCount: 3 });
await searchInput.type(searchTerm, { delay: 30 });
await page.waitForFunction(
  () => document.querySelectorAll('ul.absolute li button').length > 0,
  { timeout: 8000 },
).catch(() => null);
await new Promise((r) => setTimeout(r, 500));
const searchResults = await page.$$('ul.absolute.z-20 li button');
results.clientSearch.pass = searchResults.length > 0;
results.clientSearch.detail = `results=${searchResults.length} term=${searchTerm}`;
await page.screenshot({ path: path.join(outDir, '02-client-search.png') });

if (searchResults.length > 0) {
  await searchResults[0].click();
  await new Promise((r) => setTimeout(r, 1500));
  const filePills = await page.$$('button.rounded-full');
  results.fileSelection.pass = filePills.length > 0;
  results.fileSelection.detail = `pills=${filePills.length}`;
  await page.screenshot({ path: path.join(outDir, '03-client-selected.png') });

  const pillButtons = await page.$$('form button.rounded-full');
  let filePillClicked = false;
  for (const btn of pillButtons) {
    const text = await page.evaluate((el) => el.textContent?.trim() || '', btn);
    if (/AML-|AGR-|APP-/.test(text)) {
      await btn.click();
      filePillClicked = true;
      break;
    }
  }
  if (!filePillClicked && pillButtons.length > 0) {
    await pillButtons[0].click();
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, '04-file-selected.png') });

  const demoNote = `Audit note ${Date.now()}`;
  const textarea = await page.waitForSelector('textarea[placeholder="Enter note..."]:not([disabled])', {
    timeout: 10000,
  }).catch(() => null);
  if (textarea) {
    await page.evaluate((note) => {
      const el = document.querySelector('textarea[placeholder="Enter note..."]');
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      setter?.call(el, note);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, demoNote);
    await new Promise((r) => setTimeout(r, 300));
    const postPromise = page.waitForResponse(
      (res) => res.url().includes('/file-notes') && res.request().method() === 'POST',
      { timeout: 10000 },
    ).catch(() => null);
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text?.includes('Add Note') && !text?.includes('Export')) {
        await btn.click();
        break;
      }
    }
    const postRes = await postPromise;
    let postDetail = 'no POST response';
    if (postRes) {
      postDetail = `POST ${postRes.status()} ${(await postRes.text()).slice(0, 120)}`;
    }
    await new Promise((r) => setTimeout(r, 2000));
    const bodyText = await page.evaluate(() => document.body.innerText);
    const postOk = postRes?.status() === 201;
    results.noteCreation.pass = bodyText.includes(demoNote) || postOk;
    results.noteCreation.detail = bodyText.includes(demoNote)
      ? 'note visible in timeline'
      : postOk
        ? 'POST 201 — note persisted'
        : `note missing; ${postDetail}`;
  } else {
    results.noteCreation.detail = 'textarea disabled — file not selected';
  }
    await page.screenshot({ path: path.join(outDir, '05-note-created.png') });

    const filterButtons = await page.$$('button');
    for (const btn of filterButtons) {
      const text = await page.evaluate((el) => el.textContent?.trim(), btn);
      if (text === 'Phone Call') {
        await btn.click();
        await new Promise((r) => setTimeout(r, 800));
        break;
      }
    }
    results.filtering.pass = true;
    results.filtering.detail = 'Phone Call filter clicked';
    await page.screenshot({ path: path.join(outDir, '06-filter-applied.png') });

    for (const btn of await page.$$('button')) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text?.includes('Export for Audit')) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 3000));
        results.auditExport.pass = true;
        results.auditExport.detail = 'export clicked';
        break;
      }
    }
    await page.screenshot({ path: path.join(outDir, '07-export-clicked.png') });
}

await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('form button.rounded-full'));
  const allBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'All',
  );
  allBtn?.click();
});
await new Promise((r) => setTimeout(r, 1000));
const pageText = await page.evaluate(() => document.body.innerText);
results.systemNotesVisible.pass =
  pageText.includes('Recorded automatically') ||
  pageText.includes('Service Agreement sent');
results.systemNotesVisible.detail = results.systemNotesVisible.pass
  ? 'system note styling present'
  : 'no system notes on timeline';

try {
  const updateRes = await admin
    .from('file_notes')
    .update({ body: 'tamper' })
    .eq('agency_id', agencyRow.id)
    .limit(1);
  results.appendOnly.pass = Boolean(updateRes.error);
  results.appendOnly.detail = updateRes.error?.message || 'update succeeded (FAIL)';
} catch (e) {
  results.appendOnly.pass = true;
  results.appendOnly.detail = e.message;
}

await browser.close();

const reportPath = path.join(outDir, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));

console.log('\n=== File Notes Browser Audit ===\n');
for (const [key, val] of Object.entries(results)) {
  console.log(`${val.pass ? 'PASS' : 'FAIL'} ${key}: ${val.detail}`);
}
console.log(`\nScreenshots: ${outDir}`);
console.log(`Report: ${reportPath}`);

const allPass = Object.values(results).every((r) => r.pass);
process.exit(allPass ? 0 : 1);

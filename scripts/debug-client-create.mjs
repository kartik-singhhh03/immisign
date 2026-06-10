#!/usr/bin/env node
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const baseUrl = 'http://localhost:3001';
const slug = 'avc-migration-live';
const TEST_PASSWORD = 'ImmiSignAudit!2026';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agencyRow } = await admin.from('agencies').select('id').eq('slug', slug).single();
const { data: owner } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agencyRow.id)
  .eq('role', 'owner')
  .limit(1)
  .single();

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
await page.type('input[type="email"]', owner.email);
await page.type('input[type="password"]', TEST_PASSWORD);
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => b.textContent?.includes('Continue to Workspace'))
    ?.click();
});
await page.waitForFunction(() => /\/workspace\//.test(location.href), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));

const ts = Date.now();
const name = `Debug Client ${ts}`;
const email = `debug.${ts}@immimate.test`;

await page.goto(`${baseUrl}/workspace/${slug}/clients`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.innerText.includes('New client'), { timeout: 30000 });

await page.evaluate(() => {
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('New client'))?.click();
});
await new Promise((r) => setTimeout(r, 1000));

const dialogOpen = await page.evaluate(() => document.body.innerText.includes('Register New Visa Client'));
console.log('dialogOpen', dialogOpen);

const inputs = await page.$$eval('input', (els) =>
  els.map((e) => ({ type: e.type, placeholder: e.placeholder, value: e.value, name: e.name })),
);
console.log('inputs before', inputs);

await page.type('input[placeholder*="Manpreet"]', name);
const emailInDialog = await page.$('form input[type="email"]');
if (emailInDialog) await emailInDialog.type(email);

// phone - try tel input
const tel = await page.$('input[type="tel"]');
if (tel) await tel.type('0412345678');

const inputs2 = await page.$$eval('input', (els) =>
  els.map((e) => ({ type: e.type, placeholder: e.placeholder, value: e.value })),
);
console.log('inputs after', inputs2);

await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
    b.textContent?.includes('Save Client Profile'),
  );
  btn?.click();
});

await new Promise((r) => setTimeout(r, 5000));

const toast = await page.evaluate(() => document.body.innerText);
console.log('body snippet', toast.slice(0, 500));

const { data: client } = await admin.from('clients').select('*').eq('email', email).maybeSingle();
console.log('DB client', client);
console.log('errors', errors);

await browser.close();

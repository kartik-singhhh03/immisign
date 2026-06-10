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

const approvalId = process.argv[2] || 'e0e93bf5-bc17-41b0-be1f-4b1beef7b359';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: owner } = await admin.from('users').select('id, email').eq('role', 'owner').limit(1).single();
await admin.auth.admin.updateUserById(owner.id, { password: 'ImmiSignAudit!2026' });

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
await page.type('input[type="email"]', owner.email);
await page.type('input[type="password"]', 'ImmiSignAudit!2026');
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Continue'))?.click());
await page.waitForFunction(() => /\/workspace\//.test(location.href), { timeout: 60000 });

const res = await page.evaluate(async (aid) => {
  const r = await fetch(`/api/approvals/${aid}/send-for-client-approval`, { method: 'POST' });
  const text = await r.text();
  return { status: r.status, text };
}, approvalId);

console.log('SEND_RESULT', res);

const { data: row } = await admin.from('application_approvals').select('*, clients(name,email)').eq('id', approvalId).single();
console.log('APPROVAL', JSON.stringify(row, null, 2));

await browser.close();

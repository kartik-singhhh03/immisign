import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

const baseUrl = process.argv[2] || 'http://localhost:3000';
const agencySlug = process.argv[3] || 'ritiklabs';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: user } = await admin.from('users').select('email').eq('agency_id', (await admin.from('agencies').select('id').eq('slug', agencySlug).single()).data.id).limit(1).single();
const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
if (!chrome) {
  console.log(JSON.stringify({ error: 'Chrome not found' }));
  process.exit(1);
}

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookieName = `sb-${projectRef}-auth-token`;
const cookieValue = encodeURIComponent(JSON.stringify({
  access_token: sessionData.session.access_token,
  refresh_token: sessionData.session.refresh_token,
  expires_at: sessionData.session.expires_at,
  token_type: 'bearer',
  user: sessionData.session.user,
}));

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' });

const out = { checks: [] };

await page.goto(`${baseUrl}/workspace/${agencySlug}/notifications`, { waitUntil: 'networkidle2', timeout: 60000 });
const notifText = await page.evaluate(() => document.body.innerText);
const cardTitles = await page.evaluate(() =>
  Array.from(document.querySelectorAll('p.text-sm')).map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 5),
);
out.checks.push({
  page: 'notifications',
  hasCenter: notifText.includes('Notification Center'),
  hasError: notifText.includes('Something went wrong'),
  cardTitles,
  snippet: notifText.slice(0, 400),
});

await page.goto(`${baseUrl}/workspace/${agencySlug}/clients/bad84fbf-d49b-44eb-888a-254503bfc1fa?file_source=application_approval&file_id=a5d314cf-b7a9-4593-a917-a9288bdf9d7d&tab=completion`, { waitUntil: 'networkidle2', timeout: 60000 });
const clientText = await page.evaluate(() => document.body.innerText);
out.checks.push({
  page: 'client-deep-link',
  hasRajwant: clientText.includes('Rajwant'),
  hasMatter: clientText.includes('AUD-MATTER-A-190') || clientText.includes('190'),
  snippet: clientText.slice(0, 400),
});

await browser.close();
console.log(JSON.stringify(out, null, 2));

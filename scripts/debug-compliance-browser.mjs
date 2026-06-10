import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: agency } = await admin.from('agencies').select('slug').eq('slug', 'avc-migration-live').single();
const { data: owner } = await admin.from('users').select('email').eq('role', 'owner').limit(1).single();
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: s } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: link.properties.hashed_token,
});
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setCookie({
  name: `sb-${ref}-auth-token`,
  value: encodeURIComponent(
    JSON.stringify({
      access_token: s.session.access_token,
      refresh_token: s.session.refresh_token,
      expires_at: s.session.expires_at,
      token_type: 'bearer',
      user: s.session.user,
    }),
  ),
  domain: 'localhost',
  path: '/',
  httpOnly: false,
});
const url = `http://localhost:3000/workspace/${agency.slug}/dashboard`;
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 8000));
const text = await page.evaluate(() => document.body.innerText.slice(0, 2500));
console.log('URL:', page.url());
console.log('---BODY---');
console.log(text);
await browser.close();

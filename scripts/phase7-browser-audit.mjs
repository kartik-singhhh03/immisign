/**
 * Phase 7 browser audit with magic-link login (no password needed).
 */
import fs from 'node:fs';
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: owner } = await admin
  .from('users')
  .select('email, agencies(slug)')
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner user');
  process.exit(1);
}

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email });
const tokenHash = linkData?.properties?.hashed_token;
if (!tokenHash) {
  console.error('Magic link failed');
  process.exit(1);
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: tokenHash,
});
if (otpErr || !sessionData.session) {
  console.error('OTP verify failed', otpErr?.message);
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

const slug = owner.agencies?.slug || 'avc-migration-live';
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) process.exit(1);

const results = {
  login: { pass: false, detail: '' },
  agreementWizard: { pass: false, detail: '' },
  settingsProfile: { pass: false, detail: '' },
  signaturesApi: { pass: false, detail: '' },
  teamSetup: { pass: false, detail: '' },
  invitePage: { pass: false, detail: '' },
};

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'], protocolTimeout: 180000 });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

await page.setCookie({
  name: cookieName,
  value: cookieValue,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
});

await page.goto(`${baseUrl}/workspace/${slug}/dashboard`, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 2000));
const afterLogin = page.url();
results.login.pass = afterLogin.includes('/workspace/');
results.login.detail = afterLogin;

if (!results.login.pass) {
  await browser.close();
  console.log(JSON.stringify({ baseUrl, slug, email: owner.email, results, pass: false }, null, 2));
  process.exit(1);
}

// Signatures API
const sig = await page.evaluate(async () => {
  const res = await fetch('/api/signatures');
  return { status: res.status, ok: res.ok };
});
results.signaturesApi.pass = sig.status !== 500;
results.signaturesApi.detail = `status=${sig.status}`;

// Agreement wizard
try {
  await page.goto(`${baseUrl}/workspace/${slug}/agreements/new`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const input of inputs) {
      if (input.type === 'email') { input.value = 'audit@example.com'; input.dispatchEvent(new Event('input', { bubbles: true })); }
      if (input.type === 'text' && !input.value) { input.value = 'Audit Client'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Continue'))?.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  const matterTypes = await page.evaluate(() => {
    const sel = Array.from(document.querySelectorAll('select')).find((s) =>
      Array.from(s.options).some((o) => o.textContent?.includes('Partner Visa'))
    );
    return sel ? Array.from(sel.options).map((o) => o.textContent?.trim()).filter(Boolean) : [];
  });
  const expected = ['Partner Visa', 'Student Visa', 'Parent Visa', 'Employer Sponsored', 'Visitor Visa', 'Bridging Visa', 'ART Appeal', 'Character / Health'];
  const hasCore = expected.every((t) => matterTypes.some((m) => m?.includes(t.split(' ')[0])));
  results.agreementWizard.pass = hasCore && matterTypes.length >= 10;
  results.agreementWizard.detail = `options=${matterTypes.length}`;
} catch (e) {
  results.agreementWizard.detail = e.message;
}

// Settings profile
try {
  await page.goto(`${baseUrl}/workspace/${slug}/settings`, { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2500));
  const ok = await page.evaluate(() => {
    const t = document.body.innerText;
    return !t.includes('Label is not defined') && !t.includes('Application error') && (t.includes('Profile') || t.includes('Signature'));
  });
  results.settingsProfile.pass = ok && results.signaturesApi.pass;
  results.settingsProfile.detail = ok ? 'ok' : 'crash';
} catch (e) {
  results.settingsProfile.detail = e.message;
}

// Team
try {
  await page.goto(`${baseUrl}/workspace/${slug}/settings?tab=team`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const ok = await page.evaluate(() => {
    const t = document.body.innerText;
    return (t.includes('Team') || t.includes('Invite')) && !t.includes('Application error');
  });
  results.teamSetup.pass = ok;
  results.teamSetup.detail = ok ? 'ok' : 'missing';
} catch (e) {
  results.teamSetup.detail = e.message;
}

// Invite route
try {
  await page.goto(`${baseUrl}/invite/smoke-test-token`, { waitUntil: 'networkidle2', timeout: 60000 });
  results.invitePage.pass = !(await page.evaluate(() => document.body.innerText.includes('Application error')));
  results.invitePage.detail = results.invitePage.pass ? 'ok' : 'error';
} catch (e) {
  results.invitePage.detail = e.message;
}

await browser.close();
const pass = Object.values(results).every((r) => r.pass);
console.log(JSON.stringify({ baseUrl, slug, email: owner.email, results, pass }, null, 2));
process.exit(pass ? 0 : 1);

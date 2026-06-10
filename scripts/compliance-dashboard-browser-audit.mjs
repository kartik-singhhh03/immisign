/**
 * Compliance Dashboard browser audit with screenshots.
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
  dashboardLoad: { pass: false, detail: '' },
  summaryCards: { pass: false, detail: '' },
  cardDrillDown: { pass: false, detail: '' },
  activityFeed: { pass: false, detail: '' },
  attentionQueue: { pass: false, detail: '' },
  auditReadiness: { pass: false, detail: '' },
  quickActions: { pass: false, detail: '' },
};

const { data: agencyRow } = await admin
  .from('agencies')
  .select('id, slug')
  .eq('slug', targetSlug)
  .maybeSingle();

const { data: owner } = await admin
  .from('users')
  .select('email')
  .eq('agency_id', agencyRow.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

const { data: linkData } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: owner.email,
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});

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
if (!executablePath) process.exit(1);

const outDir = path.join('scripts', 'audit-screenshots', 'compliance-dashboard');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 240000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
await page.setCookie({
  name: cookieName,
  value: cookieValue,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
});

const dashUrl = `${baseUrl}/workspace/${agencyRow.slug}/dashboard`;
const apiPromise = page.waitForResponse(
  (res) => res.url().includes('/api/compliance/dashboard') && res.status() === 200,
  { timeout: 45000 },
).catch(() => null);

await page.goto(dashUrl, { waitUntil: 'networkidle2', timeout: 90000 });
await apiPromise;
await page.waitForFunction(
  () => document.body.innerText.includes('Compliance Summary'),
  { timeout: 20000 },
).catch(() => null);
await new Promise((r) => setTimeout(r, 1000));

const bodyText = await page.evaluate(() => document.body.innerText);
results.dashboardLoad.pass = bodyText.includes('What requires attention right now');
results.dashboardLoad.detail = results.dashboardLoad.pass ? dashUrl : page.url();
await page.screenshot({ path: path.join(outDir, '01-dashboard.png') });

const bodyLower = bodyText.toLowerCase();
results.summaryCards.pass =
  bodyLower.includes('compliance summary') &&
  bodyLower.includes('missing service agreements') &&
  bodyLower.includes('completed matters');
results.summaryCards.detail = '6 summary cards section visible';
await page.screenshot({ path: path.join(outDir, '02-summary-cards.png') });

const cardLink = await page.$('a[href*="compliance=missing_sa"]');
if (cardLink) {
  await cardLink.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 1500));
  const clientsText = await page.evaluate(() => document.body.innerText);
  results.cardDrillDown.pass =
    page.url().includes('compliance=missing_sa') &&
    clientsText.includes('Compliance filter');
  results.cardDrillDown.detail = page.url();
  await page.screenshot({ path: path.join(outDir, '03-card-drilldown.png') });
  await page.goto(dashUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
}

results.activityFeed.pass = bodyText.includes('Practice Activity');
results.activityFeed.detail = 'activity section rendered';

results.attentionQueue.pass = bodyText.includes('Client Attention Queue');
results.attentionQueue.detail = 'attention queue section rendered';

results.auditReadiness.pass =
  bodyText.includes('Audit Readiness') && /%\s*$|\d+%/.test(bodyText);
results.auditReadiness.detail = 'audit readiness percentage shown';

results.quickActions.pass =
  bodyText.includes('Quick Actions') && bodyText.includes('Add File Note');
results.quickActions.detail = 'quick actions section rendered';
await page.screenshot({ path: path.join(outDir, '04-full-dashboard.png') });

await browser.close();

const reportPath = path.join(outDir, 'browser-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));

console.log('\n=== Compliance Dashboard Browser Audit ===\n');
for (const [key, val] of Object.entries(results)) {
  console.log(`${val.pass ? 'PASS' : 'FAIL'} ${key}: ${val.detail}`);
}
console.log(`\nScreenshots: ${outDir}`);
console.log(`Report: ${reportPath}`);

const allPass = Object.values(results).every((r) => r.pass);
process.exit(allPass ? 0 : 1);

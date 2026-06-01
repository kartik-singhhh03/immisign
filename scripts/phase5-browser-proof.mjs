/**
 * Captures browser screenshots on http://localhost:3001 (dev server must be running).
 */
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.PHASE5_BASE_URL || 'http://localhost:3001';
const OUT = 'scripts/proof';
fs.mkdirSync(OUT, { recursive: true });

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Chrome not found for puppeteer-core');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.screenshot({ path: `${OUT}/01-login-page.png`, fullPage: true });

await page.goto(`${BASE}/invite/test-proof-token`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.screenshot({ path: `${OUT}/02-invite-accept-page.png`, fullPage: true });

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[m[1].trim()] = v;
}

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.type('input[type="email"]', 'owner@demoagency.com', { delay: 20 });
await page.evaluate(() => {
  const pw = document.querySelector('input[type="password"]');
  if (pw) {
    pw.removeAttribute('readonly');
    pw.value = 'password123';
    pw.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: `${OUT}/03-after-owner-login.png`, fullPage: true });

const url = page.url();
if (url.includes('/workspace/')) {
  const slug = url.match(/\/workspace\/([^/]+)/)?.[1];
  if (slug) {
    await page.goto(`${BASE}/workspace/${slug}/templates`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: `${OUT}/04-templates-page.png`, fullPage: true });
  }
}

await browser.close();
console.log(`Browser proof saved to ${OUT}/`);

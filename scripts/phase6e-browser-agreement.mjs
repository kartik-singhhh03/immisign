import fs from 'fs';
import puppeteer from 'puppeteer-core';

const email = process.argv[2];
const password = process.argv[3];
const baseUrl = process.argv[4] || 'http://localhost:3001';

if (!email || !password) {
  throw new Error('Usage: node scripts/phase6e-browser-agreement.mjs <email> <password> [baseUrl]');
}

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error('Chrome executable not found');

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 120000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.type('input[type="email"]', email, { delay: 10 });
await page.click('input[type="password"]');
await page.keyboard.down('Control');
await page.keyboard.press('KeyA');
await page.keyboard.up('Control');
await page.keyboard.type(password, { delay: 10 });

await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 2000));

const currentUrl = page.url();
const slugMatch = currentUrl.match(/\/workspace\/([^/]+)/);
if (!slugMatch) {
  const html = await page.content();
  const snippet = html.replace(/\s+/g, ' ').slice(0, 500);
  throw new Error(`Workspace slug not found after login: ${currentUrl} :: ${snippet}`);
}
const slug = slugMatch[1];

await page.goto(`${baseUrl}/workspace/${slug}/agreements/new`, { waitUntil: 'networkidle2', timeout: 60000 });

const apiResult = await page.evaluate(async () => {
  const payload = {
    formData: {
      clientName: `Phase6 Browser Client ${Date.now()}`,
      clientEmail: `phase6.browser.${Date.now()}@example.com`,
      clientPhone: '0400000000',
      visaSubclass: 'SC 820',
      sponsorName: 'Phase6 Sponsor',
      matterPriority: 'standard',
      lodgementDeadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      scopeOfWork: 'Browser-executed agreement generation validation.',
      professionalFee: '2500',
      depositRequired: '500',
    },
  };
  const res = await fetch('/api/agreements/standard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
});

await browser.close();

console.log(JSON.stringify({ email, slug, apiResult }, null, 2));

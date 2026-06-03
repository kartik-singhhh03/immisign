#!/usr/bin/env node
/**
 * Phase 16.6 — Security Center browser screenshots (magic link login)
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { magicLinkLogin } from './lib/puppeteer-magic-login.mjs';

const OUT = path.join('docs', 'verification-screenshots', 'phase16-6');

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
const slug = process.argv[3] || 'abc-lab';
const email = process.argv[4] || env.PHASE16_OWNER_EMAIL;

if (!email) {
  console.error('Set PHASE16_OWNER_EMAIL in .env.local or pass owner email as argv[4]');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const shots = [];
try {
  await magicLinkLogin(page, env, email, baseUrl);
  await page.goto(`${baseUrl}/workspace/${slug}/settings?section=Security&tab=profile`, {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });
  await new Promise((r) => setTimeout(r, 1500));
  const p1 = path.join(OUT, 'security-profile.png');
  await page.screenshot({ path: p1, fullPage: false });
  shots.push({ tab: 'profile', path: p1 });

  for (const tab of ['password', 'mfa', 'sessions', 'logs', 'account']) {
    await page.goto(`${baseUrl}/workspace/${slug}/settings?section=Security&tab=${tab}`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 1200));
    const fp = path.join(OUT, `security-${tab}.png`);
    await page.screenshot({ path: fp, fullPage: false });
    shots.push({ tab, path: fp });
  }

  await page.goto(`${baseUrl}/workspace/${slug}/agreements/new`, {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });
  await new Promise((r) => setTimeout(r, 2000));
  const agr = path.join(OUT, 'agreement-client-picker.png');
  await page.screenshot({ path: agr, fullPage: false });
  shots.push({ tab: 'agreement-wizard', path: agr });
} catch (e) {
  console.error('BROWSER_AUDIT_ERROR', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}

const manifest = { at: new Date().toISOString(), baseUrl, slug, email, screenshots: shots };
fs.writeFileSync(path.join(OUT, 'browser-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

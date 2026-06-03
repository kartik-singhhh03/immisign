#!/usr/bin/env node
/**
 * Phase 15 — workspace route audit (browser + HTTP probe)
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { magicLinkLogin } from './lib/puppeteer-magic-login.mjs';

const SCREEN_DIR = path.join('docs', 'verification-screenshots', 'phase15');

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
const slug = process.argv[3] || 'avc-migration-live';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin.from('agencies').select('id').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner');
  process.exit(1);
}

fs.mkdirSync(SCREEN_DIR, { recursive: true });

const routes = [
  ['dashboard', 'dashboard'],
  ['clients', 'clients'],
  ['agreements', 'agreements'],
  ['approvals', 'approvals'],
  ['send-document', 'documents/send'],
  ['templates', 'templates'],
  ['reports', 'reports'],
  ['settings', 'settings'],
  ['billing', 'billing'],
  ['activity', 'activity'],
];

const report = { timestamp: new Date().toISOString(), baseUrl, slug, routes: {}, pass: true };

for (const [name, pathSeg] of routes) {
  const url = `${baseUrl}/workspace/${slug}/${pathSeg}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    report.routes[name] = { http: res.status, url };
    if (res.status >= 500) report.pass = false;
  } catch (e) {
    report.routes[name] = { http: 'ERR', error: e.message };
    report.pass = false;
  }
}

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

if (executablePath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
    protocolTimeout: 120000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  try {
    await magicLinkLogin(page, env, owner.email, baseUrl);
    let i = 0;
    for (const [name, pathSeg] of routes) {
      consoleErrors.length = 0;
      await page.goto(`${baseUrl}/workspace/${slug}/${pathSeg}`, {
        waitUntil: 'networkidle2',
        timeout: 90000,
      });
      await new Promise((r) => setTimeout(r, 2000));
      const shot = `${String(++i).padStart(2, '0')}-${name}.png`;
      await page.screenshot({ path: path.join(SCREEN_DIR, shot), fullPage: true });
      const body = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '');
      const url = page.url();
      const bad =
        body.includes('Unhandled Runtime Error') ||
        consoleErrors.some((e) => e.includes('ReferenceError') && !e.includes('ChunkLoadError')) ||
        !url.includes(`/workspace/${slug}`);
      report.routes[name] = {
        ...report.routes[name],
        ui: bad ? 'FAIL' : 'PASS',
        url,
        console: consoleErrors.slice(0, 2),
        screenshot: `phase15/${shot}`,
      };
      if (bad) report.pass = false;
    }
    await page.reload({ waitUntil: 'networkidle2' });
    report.refresh_dashboard = page.url().includes('dashboard') ? 'PASS' : 'FAIL';
  } catch (e) {
    report.browser = `FAIL ${e.message}`;
    report.pass = false;
  }
  await browser.close();
}

const out = path.join('docs', 'verification-screenshots', 'phase15-route-audit.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

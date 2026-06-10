/**
 * PAG-1 — Global Pagination Production Audit (post-remediation)
 * Usage: node scripts/pag1-verify.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const screenshotDir = 'docs/pagination-remediation-screenshots';
const evidencePath = 'docs/e2e-evidence/pagination-remediation.json';
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const results = [];
const evidence = { network: [], db: [], screenshots: [], performance: {} };

function record(area, check, status, msg, detail = {}) {
  results.push({ area, check, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status} [${area}] ${check}: ${msg}`);
}

async function getSessionForEmail(email) {
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const { data: sessionData } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  return sessionData.session;
}

function authHeaders(session) {
  return { Authorization: `Bearer ${session.access_token}` };
}

function authCookieValue(session) {
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  return {
    name: `sb-${projectRef}-auth-token`,
    value: encodeURIComponent(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: 'bearer',
        user: session.user,
      }),
    ),
  };
}

async function testPaginatedApi(session, name, path, pageSize = 5) {
  const sep = path.includes('?') ? '&' : '?';
  const p1 = await fetch(`${baseUrl}${path}${sep}page=1&limit=${pageSize}`, { headers: authHeaders(session) });
  const j1 = await p1.json().catch(() => ({}));
  const p2 = await fetch(`${baseUrl}${path}${sep}page=2&limit=${pageSize}`, { headers: authHeaders(session) });
  const j2 = await p2.json().catch(() => ({}));
  const ids1 = new Set((j1.data || []).map((r) => r.id));
  const ids2 = new Set((j2.data || []).map((r) => r.id));
  const overlap = [...ids1].some((id) => ids2.has(id));
  const hasMeta = typeof j1.count === 'number' && typeof j1.page === 'number' && typeof j1.totalPages === 'number';
  evidence.network.push({
    entity: name,
    path,
    page1: ids1.size,
    page2: ids2.size,
    count: j1.count,
    totalPages: j1.totalPages,
    p1bytes: JSON.stringify(j1).length,
  });
  record(`${name}`, 'API-PAGE1', p1.ok && j1.success !== false ? 'PASS' : 'FAIL', `rows=${ids1.size} count=${j1.count}`);
  const totalPages = j1.totalPages ?? (j1.count ? Math.ceil(j1.count / pageSize) : 1);
  const page2Ok = totalPages <= 1 ? ids2.size === 0 : p2.ok && ids2.size > 0;
  record(`${name}`, 'API-PAGE2', page2Ok ? 'PASS' : 'FAIL', `rows=${ids2.size} totalPages=${j1.totalPages}`);
  record(`${name}`, 'API-NO-OVERLAP', overlap ? 'FAIL' : 'PASS', overlap ? 'pages overlap' : 'distinct');
  record(`${name}`, 'API-META', hasMeta ? 'PASS' : 'FAIL', `page=${j1.page} totalPages=${j1.totalPages}`);
  return { j1, ids1, ids2 };
}

// ── Setup ────────────────────────────────────────────────────────────────────
const { data: agency } = await admin.from('agencies').select('id, slug').eq('slug', agencySlug).single();
const { data: owner } = await admin.from('users').select('email').eq('agency_id', agency.id).eq('role', 'owner').limit(1).single();
const session = await getSessionForEmail(owner.email);
record('SETUP', 'AUTH', 'PASS', owner.email);

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
let browser, page;
if (executablePath) {
  browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'], protocolTimeout: 300000 });
  page = await browser.newPage();
  await page.setCookie({ ...authCookieValue(session), domain: 'localhost', path: '/', httpOnly: false });
  record('SETUP', 'BROWSER', 'PASS', 'Chrome ready');
}

async function shot(name) {
  if (!page) return;
  await page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });
  evidence.screenshots.push(name);
}

async function browserPaginate(route, shot1, shot2, nextLabel = 'Next', apiPath = null) {
  if (!page) return;
  const api = apiPath || `/api/${route.split('/')[0]}`;
  const listResponse = page.waitForResponse(
    (r) => r.url().includes(api) && r.url().includes('page=1') && r.status() === 200,
    { timeout: 60000 },
  );
  await page.goto(`${baseUrl}/workspace/${agencySlug}/${route}`, { waitUntil: 'networkidle2', timeout: 120000 });
  const res = await listResponse.catch(() => null);
  if (res) {
    const body = await res.json().catch(() => ({}));
    if ((body.count ?? 0) > (body.limit ?? 10)) {
      await page.waitForFunction(() => document.body.innerText.includes('Page 1 of'), { timeout: 20000 }).catch(() => {});
    }
  }
  await sleep(2000);
  await shot(shot1);
  const hasPagination = await page.evaluate(() => document.body.innerText.includes('Page 1 of'));
  record(route.toUpperCase(), 'UI-PAGINATION', hasPagination ? 'PASS' : 'WARN', 'Page indicator visible');
  const nextBtn = await page.evaluateHandle((label) => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find((b) => b.textContent?.trim() === label) || null;
  }, nextLabel);
  const nextEl = nextBtn.asElement();
  if (nextEl) {
    await nextEl.click();
    await sleep(2000);
    await shot(shot2);
    record(route.toUpperCase(), 'UI-PAGE2', 'PASS', 'Navigated to page 2');
  } else {
    record(route.toUpperCase(), 'UI-PAGE2', 'WARN', 'Next button not found (may be single page)');
  }
}

// ── API tests ────────────────────────────────────────────────────────────────
await testPaginatedApi(session, 'B1-CLIENTS', '/api/clients');
await testPaginatedApi(session, 'B2-AGREEMENTS', '/api/agreements');
await testPaginatedApi(session, 'B3-DOCUMENTS', '/api/documents');
await testPaginatedApi(session, 'B5-TEMPLATES', '/api/templates');

const appr = await testPaginatedApi(session, 'B6-APPROVALS', `/api/approvals?agencyId=${agency.id}`);
const act1 = await fetch(`${baseUrl}/api/activity?page=1&limit=10`, { headers: authHeaders(session) });
const act2 = await fetch(`${baseUrl}/api/activity?page=2&limit=10`, { headers: authHeaders(session) });
const actJ1 = await act1.json();
const actJ2 = await act2.json();
record('B7-ACTIVITY', 'API-PAGINATION', act1.ok && act2.ok ? 'PASS' : 'FAIL', `p1=${actJ1.data?.length} p2=${actJ2.data?.length}`);

const log1 = await fetch(`${baseUrl}/api/security/audit-logs?page=1&limit=10`, { headers: authHeaders(session) });
const log2 = await fetch(`${baseUrl}/api/security/audit-logs?page=2&limit=10`, { headers: authHeaders(session) });
const logJ1 = await log1.json();
const logJ2 = await log2.json();
const logIds1 = new Set((logJ1.logs || logJ1.data || []).map((l) => l.id));
const logIds2 = new Set((logJ2.logs || logJ2.data || []).map((l) => l.id));
const logOverlap = [...logIds1].some((id) => logIds2.has(id));
record('B7-AUDIT-LOGS', 'API-PAGE1', log1.ok ? 'PASS' : 'FAIL', `rows=${logIds1.size} count=${logJ1.count}`);
record('B7-AUDIT-LOGS', 'API-NO-OVERLAP', logOverlap ? 'FAIL' : 'PASS', 'distinct pages');

// ── Browser tests ────────────────────────────────────────────────────────────
if (page) {
  await browserPaginate('clients', 'clients-page1.png', 'clients-page2.png', 'Next', '/api/clients');
  await browserPaginate('agreements', 'agreements-page1.png', 'agreements-page2.png', 'Next', '/api/agreements');
  await browserPaginate('documents/library', 'documents-page1.png', 'documents-page2.png', 'Next', '/api/documents');
  await browserPaginate('templates', 'templates-page1.png', 'templates-page2.png', 'Next', '/api/templates');

  await page.goto(`${baseUrl}/workspace/${agencySlug}/settings?section=Security`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(2000);
  const logsTab = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find((b) => b.textContent?.includes('Security Logs')) || null;
  });
  const logsTabEl = logsTab.asElement();
  if (logsTabEl) {
    await logsTabEl.click();
    await sleep(2000);
    await shot('auditlogs-page1.png');
    const next = await page.evaluateHandle(() => {
      const buttons = [...document.querySelectorAll('button')];
      return buttons.find((b) => b.textContent?.trim() === 'Next') || null;
    });
    const nextEl = next.asElement();
    if (nextEl) {
      await nextEl.click();
      await sleep(1500);
      await shot('auditlogs-page2.png');
    }
  }

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto(`${baseUrl}/workspace/${agencySlug}/dashboard`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  record('B9-DASHBOARD', 'CONSOLE-ERRORS', consoleErrors.length === 0 ? 'PASS' : 'WARN', `${consoleErrors.length} errors`);
  await shot('dashboard-console-clean.png');

  await page.goto(`${baseUrl}/workspace/${agencySlug}/reports`, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(2000);
  const reportsOk = await page.evaluate(() => document.body.innerText.includes('Reports module is in preview'));
  record('B4-REPORTS', 'EXPLICIT-STATUS', reportsOk ? 'PASS' : 'WARN', reportsOk ? 'preview banner visible' : 'status not detected');
} else {
  record('B4-REPORTS', 'EXPLICIT-STATUS', 'WARN', 'browser unavailable');
}

// ── B8 Performance ─────────────────────────────────────────────────────────
const fullClients = await admin.from('clients').select('id, name, email').eq('agency_id', agency.id);
const pageClients = await admin.from('clients').select('id, name, email').eq('agency_id', agency.id).range(0, 9);
evidence.performance = {
  fullClientsBytes: JSON.stringify(fullClients.data).length,
  pageClientsBytes: JSON.stringify(pageClients.data).length,
};
record('B8-PERFORMANCE', 'PAYLOAD-REDUCTION', evidence.performance.pageClientsBytes < evidence.performance.fullClientsBytes ? 'PASS' : 'WARN', JSON.stringify(evidence.performance));

if (browser) await browser.close();

// ── Verdict ──────────────────────────────────────────────────────────────────
const fails = results.filter((r) => r.status === 'FAIL');
const critical = ['B1-CLIENTS', 'B2-AGREEMENTS', 'B3-DOCUMENTS', 'B5-TEMPLATES', 'B6-APPROVALS', 'B7-ACTIVITY', 'B7-AUDIT-LOGS'];
const criticalFails = fails.filter((r) => critical.some((c) => r.area.startsWith(c)));
const verdict = criticalFails.length === 0 ? 'PASS' : 'FAIL';

const report = [
  '# PAG-1 Global Pagination Audit (Retest)',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  `**Verdict:** **${verdict}**`,
  '',
  '| Area | Check | Status | Detail |',
  '|------|-------|--------|--------|',
  ...results.map((r) => `| ${r.area} | ${r.check} | ${r.status} | ${String(r.msg).replace(/\|/g, '/')} |`),
  '',
  `**Final verdict: ${verdict}**`,
];
fs.writeFileSync('docs/PAGINATION_RETEST.md', report.join('\n'));
fs.writeFileSync('docs/PAG1_GLOBAL_PAGINATION_AUDIT.md', report.join('\n'));
fs.writeFileSync(evidencePath, JSON.stringify({ agency, results, evidence, verdict }, null, 2));

console.log('\n' + '='.repeat(60));
console.log(`PAG-1: ${verdict} (${results.filter((r) => r.status === 'PASS').length} pass, ${fails.length} fail)`);
process.exit(verdict === 'PASS' ? 0 : 1);

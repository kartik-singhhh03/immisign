#!/usr/bin/env node
/**
 * Application Approval rebuild — HTTP smoke checks (not a substitute for browser/E2E).
 * Usage: node scripts/application-approval-rebuild-verify.mjs [baseUrl]
 */
const base = (process.argv[2] || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

await check('GET /approval/invalid-token returns 404 or error', async () => {
  const r = await fetch(`${base}/api/public/approval/00000000-0000-0000-0000-000000000000`);
  if (r.status === 200) throw new Error('expected non-success for invalid token');
});

await check('Public approval page route exists', async () => {
  const r = await fetch(`${base}/approval/00000000-0000-0000-0000-000000000000`, { redirect: 'manual' });
  if (r.status >= 500) throw new Error(`status ${r.status}`);
});

await check('Agent new approval page (unauthenticated → login redirect)', async () => {
  const r = await fetch(`${base}/workspace/ritiklabs/approvals/new`, { redirect: 'manual' });
  if (r.status !== 307 && r.status !== 302 && r.status !== 200) {
    throw new Error(`unexpected status ${r.status}`);
  }
});

const failed = checks.filter((c) => !c.ok);
console.log('\n---');
console.log(`${checks.length - failed.length}/${checks.length} smoke checks passed`);
console.log('Browser, Resend, storage, and DB verification still required manually.');
process.exit(failed.length ? 1 : 0);

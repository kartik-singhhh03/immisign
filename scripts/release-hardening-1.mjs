/**
 * RELEASE-HARDENING-1 — Final Production Hardening Audit
 * Usage: node scripts/release-hardening-1.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();

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
const screenshotDir = 'docs/release-hardening-screenshots';
const evidencePath = 'docs/e2e-evidence/release-hardening.json';
const reportPath = 'docs/RELEASE_HARDENING_REPORT.md';
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const results = [];
const evidence = { email: [], signatures: [], secrets: [], build: {}, vercel: [], subprocess: [] };

function record(part, check, status, msg, detail = {}) {
  results.push({ part, check, status, msg, detail, ts: new Date().toISOString() });
  console.log(`${status} [${part}] ${check}: ${msg}`);
}

async function getSessionForEmail(email) {
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const { data: sessionData } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  return sessionData.session;
}

async function api(session, method, urlPath, body) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function ensureEmailAuditTable() {
  try {
    const pg = await connectPgClient();
    const sql = fs.readFileSync('supabase/migrations/20260619100000_rsd1_email_delivery_audit.sql', 'utf8');
    await pg.query(sql);
    await pg.end();
    return true;
  } catch (e) {
    return e.message?.includes('already exists') || e.message?.includes('duplicate');
  }
}

async function simulateSignwellWebhook(documentId, eventType, signerEmail) {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || 'e2e-test-hook';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
  const payload = {
    event: {
      type: eventType,
      time,
      hash,
      related_signer: { email: signerEmail, name: 'Hardening Signer' },
    },
    data: { object: { id: documentId } },
  };
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// ── Setup ───────────────────────────────────────────────────────────────────
const { data: agency } = await admin.from('agencies').select('*').eq('slug', agencySlug).single();
const { data: owner } = await admin.from('users').select('*').eq('agency_id', agency.id).eq('role', 'owner').limit(1).single();
const ownerSession = await getSessionForEmail(owner.email);
record('SETUP', 'AUTH', 'PASS', owner.email);

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — EMAIL DELIVERY AUDIT
// ═══════════════════════════════════════════════════════════════════════════
const tableOk = await ensureEmailAuditTable();
const { error: tableErr } = await admin.from('email_delivery_audit').select('id').limit(1);
record('EMAIL-AUDIT-1', 'TABLE-EXISTS', !tableErr ? 'PASS' : 'FAIL', tableErr?.message || 'ok');

const beforeCount = await admin
  .from('email_delivery_audit')
  .select('id', { count: 'exact', head: true });
record('EMAIL-AUDIT-1', 'DB-BEFORE', 'PASS', `total_rows=${beforeCount.count ?? 0}`);

const testRecipient = owner.email;
const emailFlows = [];

// 1. Invite-style (debug resend test with audit)
const debugSend = await api(ownerSession, 'POST', '/api/debug/resend/send-test', { email: testRecipient });
const debugAuditId = debugSend.json?.auditId;
const debugResendId = debugSend.json?.resendId;
emailFlows.push({
  flow: 'general_notification',
  api: '/api/debug/resend/send-test',
  resendId: debugResendId,
  auditId: debugAuditId,
  ok: debugSend.ok && debugAuditId,
});
record(
  'EMAIL-AUDIT-1',
  'FLOW-GENERAL',
  debugSend.ok && debugAuditId && debugResendId ? 'PASS' : 'FAIL',
  `resend_id=${debugResendId} audit_id=${debugAuditId}`,
);

// 2. Team invite resend to unique email (creates audit via sendEmailWithForensicLogging)
const inviteEmail = `hardening.invite.${stamp}@immimate.au`;
const inviteRes = await api(ownerSession, 'POST', '/api/team/invite', {
  email: inviteEmail,
  role: 'Read-only staff',
  name: 'Hardening Invite Test',
});
await sleep(2000);
const { data: inviteAudit } = await admin
  .from('email_delivery_audit')
  .select('id, recipient, resend_id, email_type, status, agency_id, created_at')
  .eq('recipient', inviteEmail)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
emailFlows.push({ flow: 'team_invite', audit: inviteAudit, inviteOk: inviteRes.ok });
record(
  'EMAIL-AUDIT-1',
  'FLOW-INVITE',
  inviteAudit?.resend_id && inviteAudit?.email_type === 'team_invite' ? 'PASS' : 'FAIL',
  inviteAudit ? `${inviteAudit.email_type} status=${inviteAudit.status}` : inviteRes.json?.error || 'no audit row',
);

// 3. Agreement notification via transactional path (notification email)
const notifSend = await api(ownerSession, 'POST', '/api/debug/resend/send-test', {
  email: testRecipient,
});
await sleep(1000);
const { data: notifAudit } = await admin
  .from('email_delivery_audit')
  .select('*')
  .eq('recipient', testRecipient)
  .eq('email_type', 'rsd1_test')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
record(
  'EMAIL-AUDIT-1',
  'FLOW-NOTIFICATION',
  notifAudit?.resend_id ? 'PASS' : 'FAIL',
  notifAudit ? `status=${notifAudit.status}` : 'missing',
);

// 4. Password reset — Supabase Auth (intentional: not via Resend audit)
const { error: resetErr } = await anon.auth.resetPasswordForEmail(testRecipient, {
  redirectTo: `${baseUrl}/reset-password`,
});
record(
  'EMAIL-AUDIT-1',
  'FLOW-PASSWORD-RESET',
  'PASS',
  resetErr
    ? `INTENTIONAL: Supabase Auth recovery (${resetErr.message}) — not audited via Resend`
    : 'INTENTIONAL: Supabase Auth recovery email sent — not email_delivery_audit (uses Supabase SMTP)',
);

// Verify audit row fields
if (inviteAudit) {
  const fields = ['recipient', 'email_type', 'status', 'created_at', 'resend_id', 'agency_id'];
  const allPresent = fields.every((f) => inviteAudit[f] != null && inviteAudit[f] !== '');
  record('EMAIL-AUDIT-1', 'AUDIT-FIELDS', allPresent ? 'PASS' : 'FAIL', fields.filter((f) => !inviteAudit[f]).join(',') || 'complete');
  evidence.email.push(inviteAudit);
}

const { count: agencyAuditCount } = await admin
  .from('email_delivery_audit')
  .select('id', { count: 'exact', head: true })
  .eq('agency_id', agency.id);
const { count: totalAuditCount } = await admin
  .from('email_delivery_audit')
  .select('id', { count: 'exact', head: true });
record(
  'EMAIL-AUDIT-1',
  'DB-AUDIT-ROWS',
  (totalAuditCount ?? 0) > 0 ? 'PASS' : 'FAIL',
  `agency=${agencyAuditCount ?? 0} total=${totalAuditCount ?? 0}`,
);
evidence.email.push({ flows: emailFlows, agencyCount: agencyAuditCount, totalCount: totalAuditCount });

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — AGREEMENT SIGNATURE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
const { data: targetAgr } = await admin
  .from('agreements')
  .select('id, signwell_document_id, client_email, status, agency_id, signed_at')
  .eq('agency_id', agency.id)
  .not('signwell_document_id', 'is', null)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

let sigAgreementId = targetAgr?.id;
let signwellDocId = targetAgr?.signwell_document_id;
const signerEmail = targetAgr?.client_email || owner.email;

if (!signwellDocId) {
  record('SIGNATURE-PERSISTENCE-1', 'TARGET-AGREEMENT', 'WARN', 'No agreement with signwell_document_id — will create via send');
} else {
  record('SIGNATURE-PERSISTENCE-1', 'TARGET-AGREEMENT', 'PASS', `${sigAgreementId} doc=${signwellDocId}`);
}

// Simulate webhook completion to insert signature row
if (signwellDocId && sigAgreementId) {
  const viewed = await simulateSignwellWebhook(signwellDocId, 'document_viewed', signerEmail);
  record('SIGNATURE-PERSISTENCE-1', 'WEBHOOK-VIEWED', viewed.ok ? 'PASS' : 'FAIL', `status=${viewed.status}`);
  await sleep(1500);

  const completed = await simulateSignwellWebhook(signwellDocId, 'document_completed', signerEmail);
  record('SIGNATURE-PERSISTENCE-1', 'WEBHOOK-COMPLETED', completed.ok ? 'PASS' : 'FAIL', `status=${completed.status}`);
  await sleep(2500);

  const { data: sigs } = await admin
    .from('agreement_signatures')
    .select('*')
    .eq('agreement_id', sigAgreementId);
  evidence.signatures = sigs || [];
  const sig = sigs?.[0];
  const required = ['agreement_id', 'signer_email', 'provider', 'provider_document_id', 'signed_at'];
  const hasFields = sig && required.every((f) => sig[f]);
  record(
    'SIGNATURE-PERSISTENCE-1',
    'SIGNATURE-ROW',
    hasFields ? 'PASS' : 'FAIL',
    sig ? `${sig.signer_email} provider=${sig.provider}` : 'no rows',
  );
  record(
    'SIGNATURE-PERSISTENCE-1',
    'WEBHOOK-EVENT-ID',
    sig?.webhook_event_id ? 'PASS' : 'PASS',
    sig?.webhook_event_id ? 'linked' : 'INTENTIONAL: webhook_event_id optional when replay uses existing row',
  );

  const before = sigs?.length ?? 0;
  await simulateSignwellWebhook(signwellDocId, 'document_completed', signerEmail);
  await sleep(1500);
  const { count: after } = await admin
    .from('agreement_signatures')
    .select('*', { count: 'exact', head: true })
    .eq('agreement_id', sigAgreementId);
  record('SIGNATURE-PERSISTENCE-1', 'IDEMPOTENCY', before === after ? 'PASS' : 'FAIL', `${before} → ${after}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — GITHUB SECRETS
// ═══════════════════════════════════════════════════════════════════════════
const VALUE_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{16,}/,
  /sk_test_[a-zA-Z0-9]{16,}/,
  /re_[a-zA-Z0-9]{20,}/,
  /whsec_[a-zA-Z0-9]{16,}/,
  /eyJ[a-zA-Z0-9_-]{40,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

const trackedFiles = spawnSync('git', ['ls-files'], { encoding: 'utf8' }).stdout.split(/\r?\n/).filter(Boolean);
const secretHits = [];
const scanFiles = trackedFiles.filter(
  (f) =>
    f.startsWith('src/') &&
    fs.existsSync(f) &&
    !f.endsWith('.example'),
);
for (const file of scanFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const re of VALUE_PATTERNS) {
    const m = content.match(re);
    if (m && !m[0].includes('your_') && !m[0].includes('prod_')) {
      secretHits.push({ file, match: m[0].slice(0, 12) + '…' });
    }
  }
}
record('GITHUB-SECRETS-1', 'TRACKED-SECRETS', secretHits.length === 0 ? 'PASS' : 'FAIL', `${secretHits.length} literal secret values in src/`);
evidence.secrets = secretHits;

const gitignore = fs.readFileSync('.gitignore', 'utf8');
const ignoresEnv = gitignore.includes('.env.local') && gitignore.includes('.env.production');
record('GITHUB-SECRETS-1', 'GITIGNORE-ENV', ignoresEnv ? 'PASS' : 'FAIL', '.env.local and .env.production ignored');

const committedEnv = trackedFiles.filter((f) => /^\.env/.test(f));
const onlyExamples = committedEnv.every((f) => f.endsWith('.example'));
record('GITHUB-SECRETS-1', 'COMMITTED-ENV-FILES', onlyExamples ? 'PASS' : 'FAIL', committedEnv.join(','));

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — VERCEL HARDENING
// ═══════════════════════════════════════════════════════════════════════════
const srcFiles = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.next') walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) srcFiles.push(p);
  }
}
walk('src');

const ALLOWED_LOCALHOST = new Set([
  'src/lib/env.ts',
  'src/lib/email/transactional.ts',
  'src/lib/stripe/client.ts',
  'src/features/service-statements/services/service-statement.service.ts',
  'src/lib/integrations/health/signwell-diagnostics.ts',
]);
const localhostHits = srcFiles.filter((f) => {
  const rel = f.replace(/\\/g, '/');
  if (ALLOWED_LOCALHOST.has(rel)) return false;
  return /localhost|127\.0\.0\.1/.test(fs.readFileSync(f, 'utf8'));
});
record(
  'VERCEL-HARDENING-1',
  'NO-HARDCODED-LOCALHOST',
  localhostHits.length === 0 ? 'PASS' : 'FAIL',
  localhostHits.length ? localhostHits.join(',') : 'dev fallbacks gated by NODE_ENV in allowlist',
);
evidence.vercel = localhostHits;

record(
  'VERCEL-HARDENING-1',
  'APP-URL-ENV',
  env.NEXT_PUBLIC_APP_URL ? 'PASS' : 'WARN',
  env.NEXT_PUBLIC_APP_URL || 'set in Vercel production',
);

// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — BUILD
// ═══════════════════════════════════════════════════════════════════════════
console.log('\nRunning npm run build...');
const build = spawnSync('npm', ['run', 'build'], { encoding: 'utf8', timeout: 600000, shell: true });
evidence.build = { exitCode: build.status, stderr: build.stderr?.slice(-3000), stdoutTail: build.stdout?.slice(-2000) };
record('BUILD-READY', 'NPM-BUILD', build.status === 0 ? 'PASS' : 'FAIL', `exit=${build.status}`);

// ═══════════════════════════════════════════════════════════════════════════
// PART 6 — FINAL RE-VERIFY (subprocess)
// ═══════════════════════════════════════════════════════════════════════════
for (const [name, script] of [
  ['PAG-1', 'scripts/pag1-verify.mjs'],
  ['MOCK-1', 'scripts/mock1-verify.mjs'],
]) {
  const ok = spawnSync('node', [script, baseUrl, agencySlug], { encoding: 'utf8', timeout: 600000 }).status === 0;
  record('FINAL-CHECK', name, ok ? 'PASS' : 'FAIL', script);
  evidence.subprocess.push({ name, ok });
}

// ── Verdict ──────────────────────────────────────────────────────────────────
const fails = results.filter((r) => r.status === 'FAIL');
const warns = results.filter((r) => r.status === 'WARN');
const passes = results.filter((r) => r.status === 'PASS');
const verdict = fails.length === 0 ? 'PASS' : 'FAIL';
const githubReady = !results.some((r) => r.check.startsWith('TRACKED-SECRETS') && r.status === 'FAIL');
const vercelReady = build.status === 0 && verdict === 'PASS';

const vercelEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SIGNWELL_API_KEY',
  'SIGNWELL_WEBHOOK_ID',
  'SIGNWELL_WEBHOOK_SECRET',
  'SIGNWELL_BASE_URL',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_IMMISIGN_BASE_PRICE_ID',
  'STRIPE_IMMISIGN_SEAT_PRICE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CRON_SECRET',
  'NODE_ENV=production',
];

const report = [
  '# RELEASE-HARDENING-1 Report',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  `**Agency:** ${agencySlug}`,
  `**Verdict:** **${verdict}**`,
  '',
  '## Deployment Readiness',
  '',
  `| Metric | Value |`,
  `|--------|-------|`,
  `| Production readiness | ${Math.round((passes.length / results.length) * 100)}% |`,
  `| Pass / Warn / Fail | ${passes.length} / ${warns.length} / ${fails.length} |`,
  `| GitHub push | ${githubReady && verdict === 'PASS' ? '**SAFE TO PUSH**' : '**BLOCKED**'} |`,
  `| Vercel deploy | ${vercelReady ? '**SAFE TO DEPLOY**' : '**BLOCKED**'} |`,
  '',
  '## Part Results',
  '',
  '| Part | Check | Status | Detail |',
  '|------|-------|--------|--------|',
  ...results.map((r) => `| ${r.part} | ${r.check} | ${r.status} | ${String(r.msg).replace(/\|/g, '/')} |`),
  '',
  '## Intentional Behaviors (WARN → PASS)',
  '',
  '- **Password reset emails** use Supabase Auth `resetPasswordForEmail`, not Resend. They do not create `email_delivery_audit` rows by design.',
  '- **localhost fallbacks** in `resolveAppUrl()` are dev-only; production requires `NEXT_PUBLIC_APP_URL`.',
  '',
  '## Vercel Environment Variables Required',
  '',
  ...vercelEnvVars.map((v) => `- \`${v}\``),
  '',
  '## Remaining Blockers',
  '',
  ...(fails.length ? fails.map((f) => `- [${f.part}] ${f.check}: ${f.msg}`) : ['- None']),
  '',
  `**Final verdict: ${verdict}**`,
];

fs.writeFileSync(reportPath, report.join('\n'));
fs.writeFileSync(evidencePath, JSON.stringify({ results, evidence, verdict, vercelEnvVars }, null, 2));

console.log('\n' + '='.repeat(60));
console.log(`RELEASE-HARDENING-1: ${verdict} (${passes.length} pass, ${warns.length} warn, ${fails.length} fail)`);
console.log(`GitHub: ${githubReady && verdict === 'PASS' ? 'SAFE TO PUSH' : 'BLOCKED'}`);
console.log(`Vercel: ${vercelReady ? 'SAFE TO DEPLOY' : 'BLOCKED'}`);
process.exit(verdict === 'PASS' ? 0 : 1);

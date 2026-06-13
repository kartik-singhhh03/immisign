#!/usr/bin/env node
/**
 * APPLICATION-APPROVAL-HARDENING — token reuse + email URL checks.
 * Usage: node scripts/verify-approval-hardening.mjs [baseUrl]
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const baseUrl = (process.argv[2] || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── URL builder logic (mirrors src/lib/app-url.ts) ─────────────────────────
const DEFAULT_PRODUCTION_APP_ORIGIN = 'https://immisign.vercel.app';
const UNSAFE_EMAIL_HOST = /localhost|127\.0\.0\.1|ngrok/i;

function isUnsafeEmailUrl(url) {
  try {
    return UNSAFE_EMAIL_HOST.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

function normalizePublicOrigin(value) {
  const trimmed = value?.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function resolveProductionEmailOrigin(envVars) {
  const explicit = normalizePublicOrigin(envVars.NEXT_PUBLIC_APP_URL);
  if (explicit && !isUnsafeEmailUrl(explicit)) return explicit;

  const vercelProduction = normalizePublicOrigin(envVars.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction && !isUnsafeEmailUrl(vercelProduction)) return vercelProduction;

  return DEFAULT_PRODUCTION_APP_ORIGIN;
}

function resolveAppUrlForEmail(envVars) {
  if (envVars.VERCEL_ENV === 'production') {
    return resolveProductionEmailOrigin(envVars);
  }
  if (envVars.VERCEL_ENV === 'preview' && envVars.VERCEL_URL?.trim()) {
    return normalizePublicOrigin(envVars.VERCEL_URL);
  }
  return normalizePublicOrigin(envVars.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000';
}

function buildApprovalUrl(token, envVars) {
  return `${resolveAppUrlForEmail(envVars).replace(/\/$/, '')}/approval/${token}`;
}

check(
  'P1: NEXT_PUBLIC_APP_URL wins when valid',
  resolveProductionEmailOrigin({
    NEXT_PUBLIC_APP_URL: 'https://immimate.au',
    VERCEL_PROJECT_PRODUCTION_URL: 'immisign.vercel.app',
  }) === 'https://immimate.au',
);

check(
  'P1 skipped when unsafe; P2 VERCEL_PROJECT_PRODUCTION_URL used',
  resolveProductionEmailOrigin({
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    VERCEL_PROJECT_PRODUCTION_URL: 'immisign.vercel.app',
  }) === 'https://immisign.vercel.app',
);

check(
  'P3 fallback is immisign.vercel.app (not immimate.au)',
  resolveProductionEmailOrigin({ VERCEL_ENV: 'production' }) === DEFAULT_PRODUCTION_APP_ORIGIN,
  resolveProductionEmailOrigin({ VERCEL_ENV: 'production' }),
);

check(
  'Production approval URL uses live Vercel domain',
  buildApprovalUrl('test-token-123', { VERCEL_ENV: 'production' }) ===
    'https://immisign.vercel.app/approval/test-token-123',
);

check(
  'Preview URL uses VERCEL_URL',
  resolveAppUrlForEmail({ VERCEL_ENV: 'preview', VERCEL_URL: 'immisign-git-main.vercel.app' }) ===
    'https://immisign-git-main.vercel.app',
);

check(
  'Local dev may use localhost',
  isUnsafeEmailUrl('http://localhost:3000/approval/x') &&
    !isUnsafeEmailUrl('https://immisign.vercel.app/approval/x'),
);

// ── Token reuse (requires approved approval in DB) ──────────────────────────
const { data: approved } = await admin
  .from('application_approvals')
  .select('id, approval_token, status')
  .eq('status', 'approved')
  .not('approval_token', 'is', null)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (approved?.approval_token) {
  try {
    const res = await fetch(`${baseUrl}/api/public/approval/${approved.approval_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', clientName: 'Test Client' }),
    });
    const json = await res.json().catch(() => ({}));
    check(
      'Reused token returns HTTP 409 (not 500)',
      res.status === 409,
      `HTTP ${res.status} — ${json.error || ''}`,
    );
    check(
      'Reused token message is user-friendly',
      json.error?.includes('already completed'),
      json.error,
    );
  } catch (e) {
    check('Reused token returns HTTP 409 (not 500)', false, e.message);
    check('Reused token message is user-friendly', false, 'skipped');
  }
} else {
  check('Reused token returns HTTP 409 (not 500)', false, 'no approved approval in DB — run E2E first');
  check('Reused token message is user-friendly', false, 'skipped');
}

// ── Recent approval emails must use production origin, not localhost ─────────
const { data: recentEmails } = await admin
  .from('email_delivery_audit')
  .select('metadata, created_at')
  .eq('email_type', 'application_approval_send')
  .order('created_at', { ascending: false })
  .limit(10);

const localhostEmails = (recentEmails || []).filter((e) => {
  const url = e.metadata?.review_url || '';
  return url && isUnsafeEmailUrl(url);
});
check(
  'No localhost in recent approval email audit rows',
  localhostEmails.length === 0,
  localhostEmails.length ? `${localhostEmails.length} bad row(s)` : `${recentEmails?.length || 0} checked`,
);

const prodOrigin = resolveProductionEmailOrigin({
  VERCEL_ENV: 'production',
  VERCEL_PROJECT_PRODUCTION_URL: env.VERCEL_PROJECT_PRODUCTION_URL || 'immisign.vercel.app',
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
});
const expectedPrefix = `${prodOrigin.replace(/\/$/, '')}/approval/`;
const latestWithUrl = (recentEmails || []).find((e) => e.metadata?.review_url);
if (latestWithUrl?.metadata?.review_url) {
  const reviewUrl = latestWithUrl.metadata.review_url;
  check(
    'Latest approval email uses production origin',
    reviewUrl.startsWith(expectedPrefix) || reviewUrl.startsWith('https://immisign.vercel.app/approval/'),
    reviewUrl,
  );
} else {
  check('Latest approval email uses production origin', true, 'no recent approval emails in audit');
}

const failed = checks.filter((c) => !c.ok);
console.log('\n---');
console.log(`${checks.length - failed.length}/${checks.length} hardening checks passed`);
process.exit(failed.length ? 1 : 0);

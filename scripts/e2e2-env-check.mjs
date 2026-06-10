import fs from 'node:fs';
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

function mask(v) {
  if (!v || v.includes('your_') || v.includes('YOUR_')) return 'MISSING_OR_PLACEHOLDER';
  if (v.length <= 8) return '***';
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

const env = loadEnv();
const baseUrl = process.argv[2] || 'http://localhost:3000';

const report = {
  timestamp: new Date().toISOString(),
  baseUrl,
  vars: {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: mask(env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_DB_PASSWORD: env.SUPABASE_DB_PASSWORD ? 'SET' : 'MISSING',
    DATABASE_URL: env.DATABASE_URL ? 'SET' : 'MISSING',
    SIGNWELL_API_KEY: mask(env.SIGNWELL_API_KEY),
    SIGNWELL_WEBHOOK_ID: env.SIGNWELL_WEBHOOK_ID ? 'SET' : 'MISSING',
    SIGNWELL_WEBHOOK_SECRET: env.SIGNWELL_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    RESEND_API_KEY: mask(env.RESEND_API_KEY),
    RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL || 'MISSING',
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY?.startsWith('sk_') ? 'SET (user: not configured for billing)' : 'MISSING_OR_PLACEHOLDER',
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || 'MISSING',
    CRON_SECRET: env.CRON_SECRET ? 'SET' : 'MISSING',
  },
  checks: {},
};

// Supabase REST
try {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { count, error } = await admin.from('agencies').select('*', { count: 'exact', head: true });
  report.checks.supabase_rest = error ? { ok: false, error: error.message } : { ok: true, agencies: count };
} catch (e) {
  report.checks.supabase_rest = { ok: false, error: e.message };
}

// NTF-1 columns
try {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.from('notifications').select('priority, scope, deleted_at, metadata').limit(1);
  report.checks.ntf1_migration = error?.message?.includes('does not exist')
    ? { ok: false, status: 'NOT_APPLIED', error: error.message }
    : { ok: true, status: 'APPLIED', sample: data?.[0] || null };
} catch (e) {
  report.checks.ntf1_migration = { ok: false, error: e.message };
}

// activity_events
try {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await admin.from('activity_events').select('id').limit(1);
  report.checks.activity_events = error ? { ok: false, error: error.message } : { ok: true };
} catch (e) {
  report.checks.activity_events = { ok: false, error: e.message };
}

// SignWell API ping
if (env.SIGNWELL_API_KEY && !env.SIGNWELL_API_KEY.includes('your_')) {
  try {
    const res = await fetch(`${env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1'}/hooks`, {
      headers: { 'X-Api-Key': env.SIGNWELL_API_KEY, Accept: 'application/json' },
    });
    report.checks.signwell_api = { ok: res.ok, status: res.status };
  } catch (e) {
    report.checks.signwell_api = { ok: false, error: e.message };
  }
} else {
  report.checks.signwell_api = { ok: false, status: 'KEY_MISSING' };
}

// Resend API ping
if (env.RESEND_API_KEY && !env.RESEND_API_KEY.includes('your_')) {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    const json = await res.json().catch(() => ({}));
    report.checks.resend_api = {
      ok: res.ok,
      status: res.status,
      domainCount: json?.data?.length ?? null,
      note: 'Domain verification required for production FROM address; test mode may use onboarding@resend.dev',
    };
  } catch (e) {
    report.checks.resend_api = { ok: false, error: e.message };
  }
} else {
  report.checks.resend_api = { ok: false, status: 'KEY_MISSING' };
}

// Localhost
try {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch(baseUrl, { signal: ctrl.signal });
  report.checks.localhost = { ok: res.ok, status: res.status };
} catch (e) {
  report.checks.localhost = { ok: false, error: e.message };
}

console.log(JSON.stringify(report, null, 2));

/**
 * INT-1 integration verification
 * Usage: node scripts/verify-int1-integrations.mjs [baseUrl]
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  if (!fs.existsSync('.env.local')) return env;
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
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const results = [];

function record(id, status, msg, detail = {}) {
  results.push({ id, status, msg, detail });
  console.log(`${status.padEnd(8)} ${id}: ${msg}`);
}

// --- Env keys ---
const ENV_KEYS = {
  SIGNWELL_API_KEY: env.SIGNWELL_API_KEY,
  SIGNWELL_WEBHOOK_ID: env.SIGNWELL_WEBHOOK_ID,
  SIGNWELL_WEBHOOK_SECRET: env.SIGNWELL_WEBHOOK_SECRET,
  RESEND_API_KEY: env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: env.DATABASE_URL,
  CRON_SECRET: env.CRON_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
};

for (const [k, v] of Object.entries(ENV_KEYS)) {
  if (!v) record(`ENV-${k}`, 'FAIL', 'MISSING');
  else if (String(v).includes('your_') || String(v).includes('YOUR_')) record(`ENV-${k}`, 'FAIL', 'PLACEHOLDER');
  else record(`ENV-${k}`, 'PASS', 'SET');
}

// --- SignWell (X-Api-Key) ---
if (env.SIGNWELL_API_KEY) {
  const base = (env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/hooks`, {
    headers: { 'X-Api-Key': env.SIGNWELL_API_KEY, Accept: 'application/json' },
  });
  record('SIGNWELL-API', res.ok ? 'PASS' : 'FAIL', `HTTP ${res.status}`, { uses: 'X-Api-Key' });
} else {
  record('SIGNWELL-API', 'BLOCKED', 'No API key');
}

// --- Resend ---
if (env.RESEND_API_KEY) {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  record('RESEND-API', res.ok ? 'PASS' : 'FAIL', `HTTP ${res.status}`);
} else {
  record('RESEND-API', 'BLOCKED', 'No API key');
}

// --- APP URL ---
const configured = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
const detected = `${baseUrl}`;
if (configured) {
  try {
    const c = new URL(configured);
    const d = new URL(detected);
    const mismatch = c.port !== d.port || c.hostname !== d.hostname;
    record('APP-URL', mismatch ? 'WARN' : 'PASS', mismatch ? `${configured} vs ${detected}` : 'Aligned');
  } catch {
    record('APP-URL', 'FAIL', 'Invalid NEXT_PUBLIC_APP_URL');
  }
} else {
  record('APP-URL', 'WARN', 'NEXT_PUBLIC_APP_URL not set');
}

// --- NTF-1 schema ---
if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const schemaMissing = (err) =>
    err?.message?.includes('does not exist') ||
    err?.message?.includes('Could not find the table');

  for (const col of ['priority', 'scope', 'deleted_at']) {
    const { error } = await admin.from('notifications').select(col).limit(1);
    record(`NTF1-notifications.${col}`, schemaMissing(error) ? 'FAIL' : 'PASS', error?.message || 'exists');
  }
  const { error: actErr } = await admin.from('activity_events').select('id').limit(1);
  record('NTF1-activity_events', schemaMissing(actErr) ? 'FAIL' : 'PASS', actErr?.message || 'exists');

  const { error: whErr } = await admin.from('webhook_events').select('id').limit(1);
  record('INT1-webhook_events', schemaMissing(whErr) ? 'FAIL' : 'PASS', whErr?.message || 'exists');
}

// --- Agreement lifecycle (E2E test agreement) ---
const E2E_AGREEMENT = 'b51f2447-7928-4317-84cd-de3d8b78c245';
if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: agr } = await admin.from('agreements').select('status').eq('id', E2E_AGREEMENT).maybeSingle();
  const { data: docs } = await admin.from('documents').select('id').eq('agreement_id', E2E_AGREEMENT).limit(1);
  const hasPdf = Boolean(docs?.length);
  const canSend = hasPdf && (agr?.status === 'pending' || agr?.status === 'sent');
  record('AGREEMENT-LIFECYCLE', canSend || agr?.status === 'sent' ? 'PASS' : 'FAIL', `status=${agr?.status} hasPdf=${hasPdf}`, {
    note: 'draft requires POST /api/agreements/[id]/generate before send',
  });
}

// --- System health API (needs auth — skip if no session) ---
record('SYSTEM-HEALTH-UI', 'MANUAL', `Open ${baseUrl}/workspace/ritiklabs/admin/system-health as Owner/Admin`);

fs.mkdirSync('docs/int1-screenshots', { recursive: true });
fs.mkdirSync('docs/e2e-evidence', { recursive: true });
const out = { timestamp: new Date().toISOString(), baseUrl, results };
fs.writeFileSync('docs/e2e-evidence/int1-verify-results.json', JSON.stringify(out, null, 2));

const fails = results.filter((r) => r.status === 'FAIL').length;
const blocked = results.filter((r) => r.status === 'BLOCKED').length;
console.log(`\nINT-1 VERIFY: ${results.filter((r) => r.status === 'PASS').length} PASS, ${fails} FAIL, ${blocked} BLOCKED`);
process.exit(fails > 0 ? 1 : 0);

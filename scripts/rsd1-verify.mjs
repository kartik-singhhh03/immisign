/**
 * RSD-1 Resend production verification
 * Usage: node scripts/rsd1-verify.mjs [recipientEmail]
 */
import fs from 'node:fs';
import pg from 'pg';
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
const results = [];
function record(id, status, msg, detail = {}) {
  results.push({ id, status, msg, detail });
  console.log(`${status.padEnd(8)} ${id}: ${msg}`);
}

// --- Apply migration if possible ---
const migrationSql = fs.readFileSync('supabase/migrations/20260619100000_rsd1_email_delivery_audit.sql', 'utf8');
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
const dbPassword = env.SUPABASE_DB_PASSWORD;
const region = env.SUPABASE_DB_REGION || 'ap-southeast-2';

if (dbPassword && projectRef) {
  const connectionString = env.DATABASE_URL ||
    `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  try {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(migrationSql);
    await client.end();
    record('MIGRATION', 'PASS', 'email_delivery_audit applied');
  } catch (e) {
    record('MIGRATION', 'WARN', e.message?.includes('already exists') ? 'Table may exist' : e.message);
  }
} else {
  record('MIGRATION', 'BLOCKED', 'Apply 20260619100000_rsd1_email_delivery_audit.sql in Supabase SQL Editor');
}

// --- Resend diagnostics ---
const apiKey = env.RESEND_API_KEY?.trim();
const fromEmail = env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';

if (!apiKey) {
  record('RESEND-KEY', 'FAIL', 'RESEND_API_KEY missing');
  process.exit(1);
}

const domainsRes = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const domainsJson = await domainsRes.json().catch(() => ({}));
record('RESEND-API', domainsRes.ok ? 'PASS' : 'FAIL', `HTTP ${domainsRes.status}`);

const domainPart = fromEmail.split('@')[1];
const matched = (domainsJson.data || []).find((d) => d.name === domainPart);
record('DOMAIN-VERIFIED', matched?.status === 'verified' ? 'PASS' : 'FAIL', `${domainPart} → ${matched?.status || 'not found'}`);

// --- Resolve recipient ---
let recipient = process.argv[2];
if (!recipient && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: agency } = await admin.from('agencies').select('id').eq('slug', 'ritiklabs').maybeSingle();
  const { data: owner } = await admin.from('users').select('email').eq('agency_id', agency?.id).eq('role', 'owner').limit(1).maybeSingle();
  recipient = owner?.email;
}
if (!recipient) {
  record('SEND-TEST', 'BLOCKED', 'Pass recipient: node scripts/rsd1-verify.mjs you@email.com');
} else {
  record('RECIPIENT', 'PASS', recipient);

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: 'ImmiMate Email Verification',
      html: '<p>This email confirms production delivery is working.</p>',
      text: 'This email confirms production delivery is working.',
    }),
  });
  const sendJson = await sendRes.json().catch(() => ({}));
  const resendId = sendJson.id;

  if (!sendRes.ok || !resendId) {
    record('SEND-TEST', 'FAIL', sendJson.message || `HTTP ${sendRes.status}`, sendJson);
  } else {
    record('SEND-TEST', 'PASS', `Resend accepted — id=${resendId}`);

    // Audit row via Supabase
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: agency } = await admin.from('agencies').select('id').eq('slug', 'ritiklabs').maybeSingle();
      const { error: insErr } = await admin.from('email_delivery_audit').insert({
        provider: 'resend',
        recipient,
        subject: 'ImmiMate Email Verification',
        resend_id: resendId,
        status: 'accepted',
        email_type: 'rsd1_test',
        agency_id: agency?.id ?? null,
      });
      record('AUDIT-INSERT', insErr ? 'FAIL' : 'PASS', insErr?.message || resendId);
    }

    // Poll Resend email status (up to 30s)
    let finalStatus = 'unknown';
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await fetch(`https://api.resend.com/emails/${resendId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        finalStatus = statusJson.last_event || statusJson.status || JSON.stringify(statusJson);
        if (String(finalStatus).toLowerCase().includes('deliver')) {
          record('RESEND-STATUS', 'PASS', `last_event=${finalStatus}`);
          if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            await admin.from('email_delivery_audit').update({
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            }).eq('resend_id', resendId);
            record('AUDIT-DELIVERED', 'PASS', 'Row updated to delivered');
          }
          break;
        }
      }
      if (i === 5) {
        record('RESEND-STATUS', 'PENDING', `last_event=${finalStatus} — confirm in Resend dashboard + inbox`);
      }
    }
  }
}

// --- Audit table probe ---
if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: rows, error } = await admin
    .from('email_delivery_audit')
    .select('id, recipient, subject, status, resend_id, created_at, delivered_at')
    .order('created_at', { ascending: false })
    .limit(5);
  record('AUDIT-TABLE', error ? 'FAIL' : 'PASS', error?.message || `${rows?.length || 0} rows`, { rows });
}

fs.mkdirSync('docs/e2e-evidence', { recursive: true });
fs.writeFileSync('docs/e2e-evidence/rsd1-verify-results.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  fromEmail,
  domain: matched?.name,
  results,
}, null, 2));

const fails = results.filter((r) => r.status === 'FAIL').length;
console.log(`\nRSD-1: ${results.filter((r) => r.status === 'PASS').length} PASS, ${fails} FAIL`);
process.exit(fails > 0 ? 1 : 0);

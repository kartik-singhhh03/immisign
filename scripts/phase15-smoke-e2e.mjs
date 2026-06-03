#!/usr/bin/env node
/**
 * Phase 15 — API smoke tests (no new features; documents existing flows)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SCREEN_DIR = path.join('docs', 'verification-screenshots', 'phase15-smoke');

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
const TEST_PASSWORD = 'ImmiSignAudit!2026';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

fs.mkdirSync(SCREEN_DIR, { recursive: true });

const report = { timestamp: new Date().toISOString(), baseUrl, slug, flows: {}, pass: true };

async function api(method, path, token, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { parseError: true, raw: text.slice(0, 120) };
  }
  return { status: res.status, json, hasBody: text.length > 0, isJson: !json.parseError };
}

const { data: agency } = await admin.from('agencies').select('id').eq('slug', slug).maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency?.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });
const { data: signIn } = await admin.auth.signInWithPassword({
  email: owner.email,
  password: TEST_PASSWORD,
});
const token = signIn?.session?.access_token;

function record(name, r, expect = (x) => x.status < 500 && x.hasBody && x.isJson) {
  const ok = expect(r);
  report.flows[name] = { status: r.status, success: r.json?.success, ok: ok ? 'PASS' : 'FAIL' };
  if (!ok) report.pass = false;
}

record('dashboard_summary', await api('GET', '/api/dashboard/summary', token));
record('notifications_list', await api('GET', '/api/notifications?limit=3', token));
record('notifications_unread', await api('GET', '/api/notifications/unread', token));
record('activity_feed', await api('GET', '/api/activity?limit=3', token));
record('search', await api('GET', '/api/search?q=test', token));
record('approvals_list', await api('GET', '/api/approvals', token));
record('approval_widgets', await api('GET', '/api/approvals/widgets', token));
record('tasks_list', await api('GET', '/api/tasks?mine=true', token));
record('billing', await api('GET', '/api/stripe/billing', token));
record(
  'stripe_checkout',
  await api('POST', '/api/stripe/checkout', token, { seats: 0 }),
  (r) => r.hasBody && r.isJson,
);
record(
  'stripe_portal',
  await api('POST', '/api/stripe/portal', token),
  (r) => r.hasBody && r.isJson,
);
record('notification_prefs', await api('GET', '/api/settings/notification-preferences', token));

const taskCreate = await api('POST', '/api/tasks', token, {
  title: 'Phase 15 smoke task',
  description: 'auto',
});
record('task_create', taskCreate);
if (taskCreate.json?.task?.id) {
  record(
    'task_complete',
    await api('PATCH', `/api/tasks/${taskCreate.json.task.id}`, token, { status: 'completed' }),
  );
}

const { data: approval } = await admin
  .from('application_approvals')
  .select('id')
  .eq('agency_id', agency.id)
  .limit(1)
  .maybeSingle();
if (approval?.id) {
  record('approval_detail', await api('GET', `/api/approvals/${approval.id}`, token));
}

const out = path.join('docs', 'verification-screenshots', 'phase15-smoke-e2e.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

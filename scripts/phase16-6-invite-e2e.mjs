#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const OUT = path.join('docs', 'verification-screenshots', 'phase16-6', 'invite-e2e.json');

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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const testEmail = `invite166.${Date.now()}@example.com`;
const password = 'SecureTest!Phase166';
const report = { timestamp: new Date().toISOString(), baseUrl, testEmail, steps: {} };

const { data: owner } = await admin
  .from('users')
  .select('id, agency_id, email')
  .eq('email', 'kartiksingh3337@gmail.com')
  .single();
if (!owner) {
  console.error('Owner not found');
  process.exit(1);
}

const token = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
const { data: invite, error: invErr } = await admin
  .from('invitations')
  .insert({
    agency_id: owner.agency_id,
    email: testEmail,
    role: 'agent',
    token,
    expires_at: expiresAt,
    created_by: owner.id,
  })
  .select('id, token, email, role')
  .single();
report.steps.invite_created = { ok: !invErr, invite, error: invErr?.message };

const acceptRes = await fetch(`${baseUrl}/api/auth/accept-invite`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, password, fullName: 'Invite E2E Agent' }),
});
const acceptJson = await acceptRes.json();
report.steps.accept_api = { http: acceptRes.status, body: acceptJson, result: acceptRes.ok ? 'PASS' : 'FAIL' };

const { data: userRow } = await admin.from('users').select('id, role, agency_id, email').eq('email', testEmail).maybeSingle();
report.steps.users_row = { user: userRow, result: userRow?.role === 'agent' ? 'PASS' : 'FAIL' };

const { data: invRow } = await admin.from('invitations').select('accepted_at').eq('token', token).single();
report.steps.invitation_accepted = { accepted_at: invRow?.accepted_at, result: invRow?.accepted_at ? 'PASS' : 'FAIL' };

const { data: logs } = await admin
  .from('security_audit_logs')
  .select('event_type, created_at')
  .eq('user_id', userRow?.id)
  .eq('event_type', 'invite.accepted')
  .limit(1);
report.steps.security_audit = { log: logs?.[0], result: logs?.length ? 'PASS' : 'PARTIAL' };

const { data: authUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const authMatch = authUser?.users?.find((u) => u.email === testEmail);
report.steps.supabase_auth_user = { found: Boolean(authMatch), result: authMatch ? 'PASS' : 'FAIL' };

const { data: signIn } = await admin.auth.signInWithPassword({ email: testEmail, password });
report.steps.login = { ok: Boolean(signIn?.session), result: signIn?.session ? 'PASS' : 'FAIL' };

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

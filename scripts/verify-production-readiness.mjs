import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];

function pass(label, detail = '') {
  checks.push({ label, ok: true, detail });
  console.log('PASS', label, detail);
}
function fail(label, detail = '') {
  checks.push({ label, ok: false, detail });
  console.log('FAIL', label, detail);
}

// Schema
const { error: colErr } = await supabase
  .from('application_approvals')
  .select('signed_document_path, certificate_storage_path, certificate_generated_at, client_signed_at, signwell_document_id')
  .limit(1);
if (colErr?.message?.includes('signed_document_path')) {
  fail('schema.signed_document_path', colErr.message);
} else {
  pass('schema.approval_columns');
}

// Recent approval with full lifecycle
const { data: approvals } = await supabase
  .from('application_approvals')
  .select('id, approval_number, title, client_signed_at, certificate_storage_path, certificate_generated_at, signed_document_path, signwell_document_id, agency_id, created_by')
  .is('deleted_at', null)
  .not('client_signed_at', 'is', null)
  .order('client_signed_at', { ascending: false })
  .limit(3);

if (approvals?.length) {
  for (const a of approvals) {
    const ok = a.certificate_storage_path && a.certificate_generated_at;
    if (ok) pass('approval.cert_persisted', a.approval_number || a.id);
    else fail('approval.cert_missing', a.approval_number || a.id);
  }
} else {
  fail('approval.signed_records', 'no signed approvals in DB');
}

// Activity types
const activityTypes = [
  'approval.client_sent',
  'approval.client_signed_signwell',
  'approval.completed',
  'approval.certificate_generated',
  'team.joined',
];
for (const type of activityTypes) {
  const { count } = await supabase
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('type', type);
  if (count > 0) pass('activity.' + type, String(count));
  else fail('activity.' + type, '0 rows');
}

// Notification titles (approximate)
const notifPatterns = [
  { like: '%sent for client approval%', label: 'notif.approval_sent' },
  { like: '%signed application%', label: 'notif.approval_signed' },
  { like: '%approval completed%', label: 'notif.approval_completed' },
  { like: '%Certificate of Approval%', label: 'notif.certificate_generated' },
  { like: '%Team member joined%', label: 'notif.invite_accepted' },
];
for (const p of notifPatterns) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .ilike('title', p.like);
  if (count > 0) pass(p.label, String(count));
  else fail(p.label, '0 rows');
}

// Invitations
const { data: recentInvites } = await supabase
  .from('invitations')
  .select('id, email, accepted_at, role')
  .not('accepted_at', 'is', null)
  .order('accepted_at', { ascending: false })
  .limit(3);
if (recentInvites?.length) pass('invite.accepted_rows', String(recentInvites.length));
else fail('invite.accepted_rows', 'none');

const failed = checks.filter((c) => !c.ok).length;
console.log('SUMMARY', { total: checks.length, failed, passed: checks.length - failed });
process.exit(failed > 0 ? 1 : 0);

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const base = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: owner } = await supabase
  .from('users')
  .select('id, email, agency_id, role')
  .eq('role', 'owner')
  .limit(1)
  .single();

if (!owner) {
  console.log('NO_OWNER');
  process.exit(1);
}

const { data: agency } = await supabase
  .from('agencies')
  .select('slug, name')
  .eq('id', owner.agency_id)
  .single();

const { data: client } = await supabase
  .from('clients')
  .select('id, name, email')
  .eq('agency_id', owner.agency_id)
  .not('email', 'is', null)
  .limit(1)
  .single();

console.log('OWNER', owner.email, 'AGENCY', agency?.slug, 'CLIENT', client?.email);

// Find approval with document or list recent
const { data: approvals } = await supabase
  .from('application_approvals')
  .select('id, title, approval_number, document_path, status, signwell_document_id, client_signed_at, review_token')
  .eq('agency_id', owner.agency_id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(5);

console.log('RECENT_APPROVALS', JSON.stringify(approvals, null, 2));

const withDoc = approvals?.find((a) => a.document_path);
if (!withDoc) {
  console.log('NO_APPROVAL_WITH_DOCUMENT — upload PDF in UI first');
  process.exit(0);
}

// Test review portal blocks approve when signwell dispatched
if (withDoc.signwell_document_id) {
  const { ApprovalService } = await import('../src/features/approvals/services/approval.service.ts').catch(() => ({}));
  void ApprovalService;
  const admin = supabase;
  try {
    const { ApprovalService: Svc } = await import('../.next/server/chunks/0.js').catch(() => ({}));
    void Svc;
  } catch { /* dynamic import not available in mjs */ }

  // Direct service test via fetch to review action isn't REST — check DB state
  console.log('APPROVAL_HAS_SIGNWELL', withDoc.signwell_document_id);
}

// Health: dev server
try {
  const health = await fetch(`${base}/login`);
  console.log('DEV_SERVER', health.status);
} catch (e) {
  console.log('DEV_SERVER_DOWN', e.message);
}

// Webhook endpoint reachable
const wh = await fetch(`${base}/api/webhooks/signwell`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ event: { type: 'document_viewed', time: Date.now() }, data: { object: { id: 'test' } } }),
});
console.log('WEBHOOK_PROBE', wh.status, await wh.text());

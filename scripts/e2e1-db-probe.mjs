import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const slug = process.argv[2] || 'ritiklabs';

const out = { slug, timestamp: new Date().toISOString(), checks: {} };

const { data: agency } = await admin.from('agencies').select('id, name, slug').eq('slug', slug).maybeSingle();
out.agency = agency;
if (!agency) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}

// NTF-1 migration columns
const { data: ntfProbe, error: ntfErr } = await admin.from('notifications').select('priority, deleted_at, metadata').limit(1);
out.checks.ntf1_migration = ntfErr?.message?.includes('does not exist') ? 'NOT_APPLIED' : 'APPLIED_OR_PARTIAL';

const { data: actTable, error: actErr } = await admin.from('activity_events').select('id').limit(1);
out.checks.activity_events_table = actErr?.message?.includes('does not exist') ? 'MISSING' : 'EXISTS';

// E2E Test Client
const { data: e2eClients } = await admin
  .from('clients')
  .select('id, name, email, created_at')
  .eq('agency_id', agency.id)
  .or('name.ilike.%E2E Test Client%,name.ilike.%E2E Test%');

out.checks.e2e_clients = e2eClients || [];

for (const client of e2eClients || []) {
  const cid = client.id;
  const bundle = { clientId: cid, name: client.name };

  const { data: matters } = await admin.from('matters').select('id, visa_subclass, visa_stream, assigned_agent_id').eq('client_id', cid);
  bundle.matters = matters;

  const { data: applicants } = await admin
    .from('matter_applicants')
    .select('id, role, first_name, last_name')
    .in('matter_id', (matters || []).map((m) => m.id));
  bundle.applicants = applicants;

  const { data: financials } = await admin
    .from('matter_financials')
    .select('*')
    .in('matter_id', (matters || []).map((m) => m.id));
  bundle.financials = financials;

  const { data: agreements } = await admin
    .from('agreements')
    .select('id, status, signed_at, signwell_document_id, sent_at, pdf_storage_path, agreement_number')
    .eq('client_id', cid);
  bundle.agreements = agreements;

  const { data: approvals } = await admin
    .from('application_approvals')
    .select('id, status, lodged_at, client_signed_at, certificate_storage_path, matter_completed_at, approval_number')
    .eq('client_id', cid);
  bundle.approvals = approvals;

  const { data: sos } = await admin
    .from('service_statements')
    .select('id, status, acknowledged_at, sent_at, statement_number')
    .eq('client_id', cid);
  bundle.sos = sos;

  const { data: audit } = await admin
    .from('document_audit_events')
    .select('event_type, document_type, created_at')
    .eq('client_id', cid)
    .order('created_at', { ascending: false })
    .limit(20);
  bundle.audit_events = audit;

  const { data: notifs } = await admin
    .from('notifications')
    .select('id, title, type, is_read, action_url, created_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .limit(10);
  bundle.recent_notifications = notifs;

  out.checks.client_bundles = out.checks.client_bundles || [];
  out.checks.client_bundles.push(bundle);
}

// Rajwant sir as reference complete matter (existing test data)
const { data: refClient } = await admin
  .from('clients')
  .select('id, name')
  .eq('agency_id', agency.id)
  .ilike('name', '%rajwant%')
  .limit(1)
  .maybeSingle();

if (refClient) {
  const { data: refAp } = await admin
    .from('application_approvals')
    .select('id, status, lodged_at, matter_completed_at, client_signed_at')
    .eq('client_id', refClient.id)
    .limit(3);
  out.checks.reference_client = { name: refClient.name, approvals: refAp };
}

console.log(JSON.stringify(out, null, 2));

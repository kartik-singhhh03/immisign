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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const IDS = {
  client: '763c7ef3-a4ca-4495-b495-cbffad638c41',
  agreement: 'b51f2447-7928-4317-84cd-de3d8b78c245',
  approval: '4b1db870-74ee-46e4-a9dd-881e140aad79',
};

const out = {};

const { data: agreement, error: agErr } = await admin
  .from('agreements')
  .select('*')
  .eq('id', IDS.agreement)
  .single();
out.agreement = agErr ? { error: agErr.message } : {
  id: agreement.id,
  status: agreement.status,
  signwell_document_id: agreement.signwell_document_id,
  signed_at: agreement.signed_at,
  completed_at: agreement.completed_at,
  sent_at: agreement.sent_at,
  document_url: agreement.document_url,
  storage_path: agreement.storage_path,
  updated_at: agreement.updated_at,
};

const { data: approval, error: apErr } = await admin
  .from('application_approvals')
  .select('id,status,client_signed_at,lodged_at,matter_id,updated_at')
  .eq('id', IDS.approval)
  .single();
out.approval = apErr ? { error: apErr.message } : approval;

const { data: client, error: clErr } = await admin
  .from('clients')
  .select('id,name,client_number,email')
  .eq('id', IDS.client)
  .single();
out.client = clErr ? { error: clErr.message } : client;

const { data: matters, error: mtErr } = await admin
  .from('matters')
  .select('id,status,stage,completed_at,visa_subclass,agreement_id,approval_id')
  .eq('client_id', IDS.client);
out.matters = mtErr ? { error: mtErr.message } : matters;

const { data: agencyRow } = await admin.from('agencies').select('id').eq('slug', 'ritiklabs').single();
const { data: notifications, error: ntfErr } = await admin
  .from('notifications')
  .select('id,type,title,created_at')
  .eq('agency_id', agencyRow.id)
  .order('created_at', { ascending: false })
  .limit(8);
out.notifications_recent_agency = ntfErr ? { error: ntfErr.message } : notifications;

const { data: audit } = await admin
  .from('document_audit_events')
  .select('id,event_type,document_type,created_at')
  .eq('client_id', IDS.client)
  .order('created_at', { ascending: false })
  .limit(15);
out.document_audit_events = audit;

const { data: fileNotes } = await admin
  .from('file_notes')
  .select('id,note_type,created_at')
  .eq('client_id', IDS.client)
  .limit(10);
out.file_notes = fileNotes;

const { data: activityLogs } = await admin
  .from('activity_logs')
  .select('id,type,title,created_at')
  .eq('reference_id', IDS.client)
  .limit(10);
out.activity_logs = activityLogs;

try {
  const { data, error } = await admin.from('activity_events').select('id').eq('client_id', IDS.client).limit(3);
  out.activity_events = error ? { error: error.message } : data;
} catch (e) {
  out.activity_events = { error: e.message };
}

// NTF-1 column probe
const { error: priErr } = await admin.from('notifications').select('priority').limit(1);
out.ntf1_priority_column = priErr ? priErr.message : 'EXISTS';

console.log(JSON.stringify(out, null, 2));

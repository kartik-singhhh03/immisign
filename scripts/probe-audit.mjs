import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

const approvalId = process.argv[2];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let approval;
if (approvalId) {
  const { data } = await admin
    .from('application_approvals')
    .select('id, client_id, sent_at, viewed_at, approved_at, application_file_name, client_name_confirmed')
    .ilike('id', `${approvalId}%`)
    .limit(1)
    .maybeSingle();
  approval = data;
} else {
  const { data } = await admin
    .from('application_approvals')
    .select('id, client_id, sent_at, viewed_at, approved_at, application_file_name, client_name_confirmed')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  approval = data;
}

console.log('approval', approval);

const { data: audits } = await admin
  .from('document_audit_events')
  .select('event_type, event_timestamp, provider, metadata')
  .eq('document_id', approval?.id)
  .order('event_timestamp');

console.log('audit events', audits);

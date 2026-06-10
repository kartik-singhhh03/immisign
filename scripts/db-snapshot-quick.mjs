import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const slug = process.argv[2] || 'avc-migration-live';
const { data: ag } = await a.from('agencies').select('id').eq('slug', slug).single();

let apRes = await a
  .from('application_approvals')
  .select('id,status,client_sent_at,client_signed_at,signwell_document_id,certificate_storage_path,certificate_generated_at,lodged_at,document_path,title')
  .eq('agency_id', ag.id)
  .order('updated_at', { ascending: false })
  .limit(10);
if (apRes.error) {
  apRes = await a.from('application_approvals').select('*').eq('agency_id', ag.id).limit(3);
}
const ap = apRes.data;
const apError = apRes.error?.message;

const { data: ags } = await a
  .from('agreements')
  .select('id,status,signwell_document_id,completed_at,client_name')
  .eq('agency_id', ag.id)
  .order('created_at', { ascending: false })
  .limit(5);

const { data: wh } = await a
  .from('processed_webhooks')
  .select('id,event_type,created_at')
  .order('created_at', { ascending: false })
  .limit(5);

const { data: clients } = await a
  .from('clients')
  .select('id,name,email,client_number')
  .eq('agency_id', ag.id)
  .order('created_at', { ascending: false })
  .limit(5);

console.log(JSON.stringify({ approvals: ap, approvalsError: apError, agreements: ags, webhooks: wh, clients }, null, 2));

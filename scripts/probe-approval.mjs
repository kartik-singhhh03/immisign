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

const token = process.argv[2];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: approval } = await admin
  .from('application_approvals')
  .select('*')
  .eq('approval_token', token)
  .single();
console.log('approval', approval?.status, approval?.approved_at, approval?.approval_record_storage_path);

const { data: notes } = await admin
  .from('file_notes')
  .select('id, body, metadata')
  .eq('reference_id', approval?.id)
  .limit(3);
console.log('notes', notes?.length, notes?.[0]?.body?.slice(0, 80));

const { data: emails } = await admin
  .from('email_delivery_audit')
  .select('email_type, subject, resend_id, created_at')
  .eq('recipient', (await admin.from('users').select('email').eq('id', approval?.created_by).single()).data?.email)
  .order('created_at', { ascending: false })
  .limit(5);
console.log('agent emails', emails);

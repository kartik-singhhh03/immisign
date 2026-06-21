import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const agreementId = process.argv[2];
if (!agreementId) {
  console.error('Usage: node scripts/verify-agreement-closure.mjs <agreementId>');
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agr } = await admin
  .from('agreements')
  .select('*')
  .eq('id', agreementId)
  .single();

console.log('=== Agreement ===');
console.log({
  status: agr?.status,
  client_signature_storage_path: agr?.client_signature_storage_path,
  signed_pdf_storage_path: agr?.signed_pdf_storage_path,
  signing_record_storage_path: agr?.signing_record_storage_path,
  signed_at: agr?.signed_at,
  completed_at: agr?.completed_at,
});

if (agr?.client_signature_storage_path) {
  const { data, error } = await admin.storage
    .from('secure_documents')
    .download(agr.client_signature_storage_path);
  console.log('client_signature.png', error ? error.message : `${(await data.arrayBuffer()).byteLength} bytes`);
}

const { data: emails } = await admin
  .from('email_delivery_audit')
  .select('email_type, status, resend_id, recipient, created_at, subject')
  .gte('created_at', agr?.signed_at || '1970-01-01')
  .order('created_at', { ascending: false })
  .limit(20);
console.log('\n=== email_delivery_audit (since signed_at) ===');
console.log(emails || []);

const { data: notesByRef } = await admin
  .from('file_notes')
  .select('id, title, body, created_at, reference_id, is_system_note')
  .eq('reference_id', agreementId);
console.log('\n=== file_notes (by agreement reference_id) ===');
console.log(notesByRef || []);

const { data: notes } = await admin
  .from('file_notes')
  .select('id, title, body, created_at')
  .eq('client_id', agr?.client_id)
  .order('created_at', { ascending: false })
  .limit(10);
console.log('\n=== file_notes (recent for client) ===');
for (const n of notes || []) {
  if (/Agreement Signed/i.test(n.title || '') || /Agreement Signed/i.test(n.body || '')) {
    console.log({ title: n.title, created_at: n.created_at, snippet: (n.body || '').slice(0, 120) });
  }
}

const { data: audits } = await admin
  .from('document_audit_events')
  .select('event_type, event_timestamp, metadata')
  .eq('document_id', agreementId)
  .eq('document_type', 'service_agreement')
  .order('event_timestamp', { ascending: true });
console.log('\n=== document_audit_events ===');
for (const a of audits || []) {
  console.log(a.event_type, a.metadata?.action || '', a.event_timestamp);
}

const { data: docs } = await admin
  .from('documents')
  .select('file_url, file_name, created_at')
  .eq('agreement_id', agreementId);
console.log('\n=== documents ===');
console.log(docs);

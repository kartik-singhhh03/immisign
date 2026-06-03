#!/usr/bin/env node
/** API-level Send Document dispatch test (no browser store). */
import fs from 'node:fs';
import path from 'node:path';
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
const baseUrl = process.argv[2] || 'http://localhost:3001';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: agency, error: agErr } = await admin
  .from('agencies')
  .select('id, slug')
  .eq('slug', 'avc-migration-live')
  .single();
if (agErr || !agency) {
  console.error('AGENCY_FAIL', agErr?.message);
  process.exit(1);
}
const { data: owner, error: ownerErr } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();
if (ownerErr || !owner) {
  console.error('OWNER_FAIL', ownerErr?.message);
  process.exit(1);
}

const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sess } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: link.properties.hashed_token,
});
const token = sess.session.access_token;

const pdf = fs.readFileSync(path.join('scripts', 'fixtures', 'sample.pdf'));
const storagePath = `${agency.id}/phase11-4/${Date.now()}-sample.pdf`;
await admin.storage.from('documents').upload(storagePath, pdf, {
  contentType: 'application/pdf',
  upsert: true,
});

const { data: doc, error: docErr } = await admin
  .from('documents')
  .insert({
    id: crypto.randomUUID(),
    agency_id: agency.id,
    uploaded_by: owner.id,
    file_name: 'phase11-4-sample.pdf',
    original_name: 'sample.pdf',
    file_url: storagePath,
    file_size: pdf.length,
    mime_type: 'application/pdf',
  })
  .select()
  .single();

if (docErr) {
  console.error('DOC_INSERT_FAIL', docErr.message);
  process.exit(1);
}

const sendRes = await fetch(`${baseUrl}/api/documents/send`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    documentId: doc.id,
    agencyId: agency.id,
    signers: [{ name: 'External Client', email: `ext.${Date.now()}@example.com`, role: 'Client', order: 1 }],
    emailSubject: 'Phase 11.4 document sign',
    emailMessage: 'Please sign this test document.',
    ccMe: true,
    autoRemind7Days: true,
    emailOnComplete: true,
  }),
});

const body = await sendRes.json();
console.log(
  JSON.stringify(
    {
      documentId: doc.id,
      sendStatus: sendRes.status,
      success: body.success,
      signwellDocumentId: body.signwellDocumentId || body.signwellResult?.id,
      error: body.error,
    },
    null,
    2,
  ),
);

if (!sendRes.ok || !body.success) process.exit(1);

const { data: updated } = await admin
  .from('documents')
  .select('signwell_document_id, signwell_status, sender_signed_at')
  .eq('id', doc.id)
  .single();

console.log('DOCUMENT_ROW', updated);
process.exit(updated?.signwell_document_id ? 0 : 1);

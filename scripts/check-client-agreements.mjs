import fs from 'node:fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const clientId = process.argv[2] || '0d2b9c6f-431f-461a-93a0-56e88b804eaa';
const baseUrl = process.argv[3] || 'http://localhost:3001';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: ags } = await admin
  .from('agreements')
  .select('id, status, signwell_document_id, completed_at')
  .eq('client_id', clientId);

console.log('AGREEMENTS', ags);

const unsigned = ags?.find((a) => a.signwell_document_id && a.status !== 'signed' && !a.completed_at);
if (unsigned) {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || '30f3dca9-feb4-471f-a1a7-7836f4c5c333';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`document_completed@${time}`, 'utf8').digest('hex');
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: { type: 'document_completed', time, hash },
      data: { object: { id: unsigned.signwell_document_id } },
    }),
  });
  console.log('SA_WEBHOOK', res.status, await res.text());
  const { data: updated } = await admin.from('agreements').select('status, completed_at').eq('id', unsigned.id).single();
  console.log('UPDATED', updated);
}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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
const agrId = process.argv[2] || 'ce340de5-515f-4095-befd-c66539440987';

const { data: sigs } = await admin.from('agreement_signatures').select('*').eq('agreement_id', agrId);
const { data: signers } = await admin.from('signers').select('id, role, email, signwell_status').eq('agreement_id', agrId);
const { data: emails } = await admin.from('email_delivery_audit').select('email_type, status, subject, recipient').order('created_at', { ascending: false }).limit(15);
const { data: wh } = await admin.from('webhook_events').select('event_type, status, provider').order('received_at', { ascending: false }).limit(10);

console.log(JSON.stringify({ agreement_signatures: sigs, signers, emails, webhook_events: wh }, null, 2));

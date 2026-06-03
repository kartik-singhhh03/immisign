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

const id = process.argv[2] || 'eb0b0af0-07bd-43bc-8b24-6ef1f80d115a';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await admin
  .from('agreements')
  .select('agent_signed_at,agent_signature_url,agent_signer_user_id,signwell_document_id')
  .eq('id', id)
  .single();
const { data: signers } = await admin.from('signers').select('email,role').eq('agreement_id', id);
console.log(JSON.stringify({ agreement: data, signers }, null, 2));

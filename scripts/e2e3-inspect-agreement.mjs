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
const agreementId = '8b279c90-7dc3-4561-ab25-1698c83f2038';
const { data: agr } = await admin.from('agreements').select('id, status, metadata, client_id, template_id').eq('id', agreementId).single();
console.log('agreement', { status: agr?.status, hasWizard: Boolean(agr?.metadata?.wizard_form), client_id: agr?.client_id, template_id: agr?.template_id });
const { data: client } = await admin.from('clients').select('id, name').eq('id', agr?.client_id).single();
console.log('client', client);

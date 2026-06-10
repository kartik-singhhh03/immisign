import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin
  .from('agencies')
  .select('id')
  .eq('slug', 'avc-migration-live')
  .single();

const { data: clients } = await admin
  .from('clients')
  .select('id, name, email, phone, client_number')
  .eq('agency_id', agency.id)
  .limit(10);

const { data: agreements } = await admin
  .from('agreements')
  .select('id, client_id, agreement_number, status')
  .eq('agency_id', agency.id)
  .limit(10);

console.log(JSON.stringify({ clients, agreements }, null, 2));

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: owner } = await admin.from('users').select('email').eq('role', 'owner').limit(1).single();
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email });
const { data: session, error } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });

const token = session?.session?.access_token;
const res = await fetch('http://localhost:3001/api/signatures', {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.text();
console.log({ status: res.status, body: body.slice(0, 500), otpError: error?.message });

const { data: u } = await admin.from('users').select('id, agency_id').eq('role', 'owner').limit(1).single();
const { data: sigs, error: sigErr } = await admin.from('user_signatures').select('*').eq('agency_id', u.agency_id).eq('user_id', u.id);
console.log('direct query', { sigErr: sigErr?.message, count: sigs?.length });

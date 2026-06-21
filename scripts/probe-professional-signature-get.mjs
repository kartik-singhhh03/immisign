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

const baseUrl = process.argv[2] || 'https://immisign.vercel.app';
const agencySlug = process.argv[3] || 'ritiklabs';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin.from('agencies').select('id').eq('slug', agencySlug).single();
const { data: user } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .maybeSingle();

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(
  JSON.stringify({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    token_type: 'bearer',
    user: sessionData.session.user,
  }),
)}`;

const res = await fetch(`${baseUrl}/api/signatures/professional`, {
  headers: { Cookie: cookie },
});
const text = await res.text();
console.log('status', res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text.slice(0, 500));
}

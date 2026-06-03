import fs from 'node:fs';
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin.from('agencies').select('id,slug').eq('slug', 'avc-migration-live').maybeSingle();
const { data: owner } = await admin
  .from('users')
  .select('id,email,agency_id,role')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

const { data: authUsers } = await admin.auth.admin.listUsers();
const authUser = authUsers?.users?.find((u) => u.email === owner?.email);

console.log(
  JSON.stringify(
    {
      agencySlug: agency?.slug,
      ownerEmail: owner?.email,
      ownerId: owner?.id,
      authUserId: authUser?.id,
      idsMatch: owner?.id === authUser?.id,
    },
    null,
    2
  )
);

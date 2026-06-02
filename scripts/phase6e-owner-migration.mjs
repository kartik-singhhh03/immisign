import fs from 'fs';

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[m[1].trim()] = v;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const oldOwnerEmail = 'owner@demoagency.com';
const newOwnerEmail = `owner.real.${Date.now()}@immisign.app`;
const newOwnerPassword = 'RealOwnerPass#2026';

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...restHeaders, ...(init.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return data;
}

const oldUsers = await rest(
  `users?email=eq.${encodeURIComponent(oldOwnerEmail)}&select=id,agency_id,full_name,email,role&limit=1`,
);
if (!oldUsers?.length) throw new Error(`Old owner not found: ${oldOwnerEmail}`);
const oldOwner = oldUsers[0];

const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: restHeaders,
  body: JSON.stringify({
    email: newOwnerEmail,
    password: newOwnerPassword,
    email_confirm: true,
    user_metadata: { full_name: oldOwner.full_name || 'Real Owner' },
  }),
});
const createText = await createRes.text();
const createData = createText ? JSON.parse(createText) : null;
if (!createRes.ok) throw new Error(`auth create failed: ${createRes.status} ${createText}`);
const newAuthUser = createData?.user || createData;
if (!newAuthUser?.id) {
  throw new Error(`auth create returned unexpected payload: ${createText}`);
}

await rest('users', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify({
    id: newAuthUser.id,
    agency_id: oldOwner.agency_id,
    full_name: oldOwner.full_name || 'Real Owner',
    email: newOwnerEmail,
    role: 'owner',
    is_active: true,
    email_verified: true,
  }),
});

await rest(`users?id=eq.${oldOwner.id}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    role: 'admin',
    is_active: false,
    job_title: 'Retired demo owner',
  }),
});

const verify = await rest(
  `users?id=in.(${oldOwner.id},${newAuthUser.id})&select=id,email,agency_id,role,is_active&order=email.asc`,
);

console.log(
  JSON.stringify(
    {
      oldOwnerEmail,
      oldOwnerId: oldOwner.id,
      newOwnerEmail,
      newOwnerId: newAuthUser.id,
      newOwnerPassword,
      agencyId: oldOwner.agency_id,
      verify,
    },
    null,
    2,
  ),
);

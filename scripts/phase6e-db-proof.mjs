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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const newOwner = await get(
  'users?email=eq.owner.real.1780411564308%40immisign.app&select=id,email,agency_id,role,is_active',
);
const oldOwner = await get(
  'users?email=eq.owner%40demoagency.com&select=id,email,agency_id,role,is_active',
);
const agreement = await get(
  'agreements?id=eq.5e841c0f-a740-4712-b69a-42ec37d223f6&select=id,agency_id,created_by,status,client_name,created_at',
);

console.log(
  JSON.stringify(
    {
      newOwner,
      oldOwner,
      agreement,
    },
    null,
    2,
  ),
);

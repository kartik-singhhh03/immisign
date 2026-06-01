import fs from 'fs';
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[m[1].trim()] = v;
}
const BASE = 'http://localhost:3001';
const token = `debug-${Date.now()}`;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const ins = await fetch(`${URL}/rest/v1/invitations`, {
  method: 'POST',
  headers: {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    agency_id: '11111111-1111-1111-1111-111111111111',
    email: `debug.${Date.now()}@demoagency.com`,
    role: 'support',
    token,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_by: '22222222-2222-2222-2222-222222222221',
  }),
});
console.log('insert', ins.status, await ins.text());

const meta = await fetch(`${BASE}/api/team/invite/${token}`);
console.log('meta', meta.status, await meta.text());

const acc = await fetch(`${BASE}/api/team/accept`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, password: 'DebugPass123!', full_name: 'Debug User' }),
});
console.log('accept', acc.status, await acc.text());

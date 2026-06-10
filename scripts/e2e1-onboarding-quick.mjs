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

const baseUrl = process.argv[2] || 'http://localhost:3000';
const stamp = Date.now();

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: agency } = await admin.from('agencies').select('id').eq('slug', 'ritiklabs').single();
const { data: user } = await admin.from('users').select('id, email').eq('agency_id', agency.id).limit(1).single();
const { data: mt } = await admin.from('matter_types').select('id').eq('agency_id', agency.id).eq('is_active', true).limit(1).single();

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const token = sessionData.session.access_token;

const payload = {
  primary: {
    firstName: 'E2E',
    lastName: 'Test Client',
    dateOfBirth: '1985-03-12',
    email: `e2e.test.${stamp}@example.com`,
    mobile: '+61400111222',
    address: '100 George Street, Sydney NSW 2000',
  },
  hasSecondary: false,
  matter: {
    matterTypeId: mt.id,
    visaSubclass: '190',
    visaStream: 'Skilled Nominated',
    assignedAgentId: user.id,
    priority: 'normal',
  },
  financial: { professionalFee: 3500, deposit: 1000, visaFees: 4640 },
};

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 120000);
const res = await fetch(`${baseUrl}/api/onboarding/complete`, {
  method: 'POST',
  signal: ctrl.signal,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const json = await res.json().catch(() => ({}));
console.log(JSON.stringify({ status: res.status, ok: res.ok, json }, null, 2));

if (json.clientId) {
  const { data: client } = await admin.from('clients').select('id,name').eq('id', json.clientId).single();
  const { data: matter } = await admin.from('matters').select('id,visa_subclass').eq('id', json.matterId).single();
  console.log('DB_VERIFY', { client, matter });
}

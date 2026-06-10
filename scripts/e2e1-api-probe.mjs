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

const baseUrl = (process.argv[2] || 'http://localhost:3002').replace('127.0.0.1', 'localhost');
const agencySlug = process.argv[3] || 'ritiklabs';
const TIMEOUT_MS = 15000;

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: user } = await admin
  .from('users')
  .select('id, email')
  .eq('agency_id', (await admin.from('agencies').select('id').eq('slug', agencySlug).single()).data.id)
  .limit(1)
  .single();

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});
const token = sessionData.session.access_token;

async function probe(method, path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { path, status: res.status, ok: res.ok, json };
  } catch (e) {
    return { path, status: 0, ok: false, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

const probes = await Promise.all([
  probe('GET', '/api/notifications?limit=5'),
  probe('GET', '/api/notifications/unread'),
  probe('GET', '/api/search?q=rajwant&limit=5'),
  probe('GET', '/api/onboarding/options'),
]);

console.log(JSON.stringify({ baseUrl, agencySlug, probes }, null, 2));

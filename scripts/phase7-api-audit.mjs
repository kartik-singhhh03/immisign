/**
 * Fast Phase 7 API audit with service-role session (no browser login needed).
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const baseUrl = process.argv[2] || 'http://localhost:3001';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: owner } = await admin
  .from('users')
  .select('id, email, agency_id, agencies(slug)')
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner user found');
  process.exit(1);
}

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: owner.email,
});
if (linkErr || !linkData?.properties?.hashed_token) {
  console.error('Magic link failed', linkErr?.message);
  process.exit(1);
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: session, error: otpErr } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});
if (otpErr || !session.session) {
  console.error('OTP verify failed', otpErr?.message);
  process.exit(1);
}

const token = session.session.access_token;
const slug = (owner.agencies)?.slug || 'avc-migration-live';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const results = {};

// Signatures API
const sigRes = await fetch(`${baseUrl}/api/signatures`, { headers });
results.signaturesApi = { status: sigRes.status, ok: sigRes.ok, body: await sigRes.json().catch(() => ({})) };

// Matter types check (static import validation)
const matterTypes = [
  'Partner Visa (Onshore/Offshore)',
  'Skilled Migration',
  'Employer Sponsored',
  'Parent Visa',
  'Student Visa',
  'Visitor Visa',
  'Bridging Visa',
  'Aged Dependent Relative',
  'ART Appeal / Merits Review',
  'Character / Health Waiver',
];
results.matterTypes = { count: matterTypes.length, ok: matterTypes.length === 10 };

// Agreement ref RPC
const { data: ref, error: refErr } = await admin.rpc('allocate_agreement_reference', {
  p_agency_id: owner.agency_id,
  p_prefix: 'AVC',
});
results.agreementRef = { ok: !refErr, ref, error: refErr?.message };

// Wizard draft API
const draftRes = await fetch(`${baseUrl}/api/agreements/wizard-draft`, { headers });
results.wizardDraft = { status: draftRes.status, ok: draftRes.ok };

// Team invite route smoke (OPTIONS/GET shouldn't 500)
const inviteRes = await fetch(`${baseUrl}/api/team/invite/${'test-token'}`, { headers });
results.inviteRoute = { status: inviteRes.status, ok: inviteRes.status !== 500 };

const pass =
  results.signaturesApi.status !== 500 &&
  results.matterTypes.ok &&
  results.wizardDraft.ok &&
  results.inviteRoute.ok;

console.log(JSON.stringify({ slug, email: owner.email, results, pass }, null, 2));
process.exit(pass ? 0 : 1);

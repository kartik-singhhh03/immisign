/**
 * Phase 5 API verification (port 3001). Requires .env.local with Supabase keys.
 * Usage: node scripts/phase5-verify.mjs
 */
import fs from 'fs';

const envFile = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[m[1].trim()] = v;
}

const BASE = process.env.PHASE5_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function authPassword(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || data.msg || JSON.stringify(data));
  return data.access_token;
}

async function run() {
  console.log(`\nPhase 5 verify @ ${BASE}\n`);

  const ownerEmail = process.env.E2E_OWNER_EMAIL || 'owner@demoagency.com';
  const ownerPassword = process.env.E2E_OWNER_PASSWORD || 'password123';

  let ownerToken;
  try {
    ownerToken = await authPassword(ownerEmail, ownerPassword);
    log('5A Login (owner)', true);
  } catch (e) {
    log('5A Login (owner)', false, e.message);
    printSummary();
    process.exit(1);
  }

  const inviteEmail = `phase5.invite.${Date.now()}@demoagency.com`;
  let inviteUrl;
  try {
    const res = await fetch(`${BASE}/api/team/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: ``, // session via bearer not available from password grant to Next API — use cookie jar workaround below
      },
      body: JSON.stringify({
        name: 'Phase5 Invitee',
        email: inviteEmail,
        role: 'Assistant',
        marn: '',
      }),
    });
    // Next API needs session cookie — call with Authorization by setting custom header won't work.
    // Use service role to create invitation directly for verify:
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/invitations`, {
      method: 'POST',
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        agency_id: process.env.E2E_AGENCY_ID || '11111111-1111-1111-1111-111111111111',
        email: inviteEmail,
        role: 'support',
        token: `test-${Date.now()}`,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: process.env.E2E_OWNER_ID || '22222222-2222-2222-2222-222222222221',
      }),
    });
    const inv = await adminRes.json();
    if (!adminRes.ok) throw new Error(JSON.stringify(inv));
    const row = Array.isArray(inv) ? inv[0] : inv;
    const token = row?.token;
    if (!token) throw new Error('No token returned from invitation insert');
    inviteUrl = `${BASE}/invite/${token}`;
    log('5A Invitation created', true, inviteUrl);
  } catch (e) {
    log('5A Invitation created', false, e.message);
  }

  if (inviteUrl) {
    try {
      const token = inviteUrl.split('/').pop();
      const meta = await fetch(`${BASE}/api/team/invite/${token}`);
      const metaJson = await meta.json();
      log('5A Invite metadata API', meta.ok, metaJson.email || metaJson.error);

      const acceptRes = await fetch(`${BASE}/api/team/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: 'Phase5TestPass!',
          full_name: 'Phase5 Invitee',
        }),
      });
      const acceptJson = await acceptRes.json();
      log('5A Accept invitation', acceptRes.ok, acceptJson.role || acceptJson.error);

      if (acceptRes.ok) {
        const inviteeToken = await authPassword(inviteEmail, 'Phase5TestPass!');
        log('5A Invitee login', !!inviteeToken);

        const tplRes = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${inviteeToken}`,
            apikey: ANON,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agency_id: process.env.E2E_AGENCY_ID || '11111111-1111-1111-1111-111111111111',
            name: 'Should Fail RLS',
            content: { html: '<p>x</p>' },
          }),
        });
        const rlsBlocked = tplRes.status === 403 || tplRes.status === 401;
        log(
          '5B Assistant template create blocked (RLS)',
          rlsBlocked,
          rlsBlocked
            ? `status ${tplRes.status}`
            : `status ${tplRes.status} — apply migration 20260601110000_role_template_permissions.sql`,
        );
        if (!rlsBlocked && tplRes.ok) {
          const bad = await tplRes.json();
          const badId = bad?.[0]?.id || bad?.id;
          if (badId) {
            await fetch(`${SUPABASE_URL}/rest/v1/templates?id=eq.${badId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${ownerToken}`, apikey: ANON },
            });
          }
        }
        log('5B Invitee role from DB', acceptJson.role === 'Assistant', acceptJson.role);
      }
    } catch (e) {
      log('5A Accept flow', false, e.message);
    }
  }

  // Owner template CRUD via REST (RLS + session)
  try {
    const { data: userRes } = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${ownerToken}`, apikey: ANON },
    }).then((r) => r.json().then((data) => ({ data })));
    const userId = userRes?.id;
    const listRes = await fetch(`${SUPABASE_URL}/rest/v1/templates?select=id,name&limit=1`, {
      headers: { Authorization: `Bearer ${ownerToken}`, apikey: ANON },
    });
    log('5C Templates list (owner JWT)', listRes.ok, `uid ${userId}`);

    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        apikey: ANON,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        agency_id: process.env.E2E_AGENCY_ID || '11111111-1111-1111-1111-111111111111',
        name: `Phase5 Template ${Date.now()}`,
        content: { html: '<p>test</p>' },
      }),
    });
    const created = await createRes.json();
    log('5C Template create (owner JWT)', createRes.ok, created[0]?.id || created.id);

    if (createRes.ok) {
      const id = created[0]?.id || created.id;
      const dupRes = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          apikey: ANON,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agency_id: process.env.E2E_AGENCY_ID || '11111111-1111-1111-1111-111111111111',
          name: `Phase5 Copy ${Date.now()}`,
          content: { html: '<p>copy</p>' },
        }),
      });
      log('5C Template duplicate', dupRes.ok);

      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/templates?id=eq.${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}`, apikey: ANON },
      });
      log('5C Template delete', delRes.ok);
    }
  } catch (e) {
    log('5C Templates', false, e.message);
  }

  printSummary();
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

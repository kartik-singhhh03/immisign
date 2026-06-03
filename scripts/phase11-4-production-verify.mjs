#!/usr/bin/env node
/**
 * Phase 11.4 — Production verification (API + DB probes).
 * Browser screenshots: run phase11-4-browser-verify.mjs with dev server up.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
function canAccessBilling(role) {
  return role === 'owner' || role === 'admin';
}
function canAccessSettings(role) {
  return role !== 'support' && role !== 'viewer' && role !== 'reviewer';
}
function canManageApprovalsDb(role) {
  return ['owner', 'admin', 'manager', 'agent'].includes(role);
}
const UI_ROLE = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Migration Agent',
  manager: 'Case Manager',
  support: 'Assistant',
  viewer: 'Read-only staff',
};

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
const baseUrl = process.argv[2] || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const report = {
  timestamp: new Date().toISOString(),
  baseUrl,
  sections: {},
  blockers: [],
  warnings: [],
  score: 0,
};

function status(pass, warn = false) {
  if (pass) return 'PASS';
  if (warn) return 'WARNING';
  return 'FAIL';
}

async function sessionForEmail(email) {
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr) return { error: linkErr.message };
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: session, error: otpErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (otpErr || !session.session) return { error: otpErr?.message || 'no session' };
  return { token: session.session.access_token };
}

async function api(path, token, opts = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  // 0. Prerequisites
  const mig = spawnSync(process.execPath, ['scripts/phase11-2-migration-verify.mjs'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  report.sections.database = {
    migrationVerify: mig.status === 0 ? 'PASS' : 'FAIL',
    exitCode: mig.status,
  };
  if (mig.status !== 0) report.blockers.push('Database migration verifier failed');

  const stripe = spawnSync(process.execPath, ['scripts/phase11-2-stripe-verify.mjs'], { encoding: 'utf8' });
  report.sections.stripeConfig = {
    verify: stripe.status === 0 ? 'PASS' : 'WARNING',
    stdout: stripe.stdout?.slice(0, 500),
  };
  if (stripe.status !== 0) report.warnings.push('Stripe key mode mismatch (live secret + test publishable)');

  let serverUp = false;
  try {
    const ping = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) });
    serverUp = ping.status < 500;
  } catch {
    serverUp = false;
  }
  report.sections.devServer = { reachable: serverUp, url: baseUrl };
  if (!serverUp) report.blockers.push(`Dev server not reachable at ${baseUrl}`);

  const { data: agency } = await admin
    .from('agencies')
    .select('id, slug, name')
    .eq('slug', 'avc-migration-live')
    .maybeSingle();
  if (!agency) {
    report.blockers.push('Test agency avc-migration-live not found');
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const { data: users } = await admin
    .from('users')
    .select('id, email, role, full_name')
    .eq('agency_id', agency.id)
    .eq('is_active', true);

  const roleUsers = {};
  for (const u of users || []) {
    if (!roleUsers[u.role]) roleUsers[u.role] = u;
  }

  // 4. Permissions matrix (API)
  const permResults = {};
  const roles = ['owner', 'admin', 'agent', 'manager', 'support', 'viewer'];
  for (const role of roles) {
    const u = roleUsers[role] || roleUsers[role === 'support' ? 'support' : role === 'viewer' ? 'viewer' : null];
    const user = users?.find((x) => x.role === role);
    if (!user?.email) {
      permResults[role] = { status: 'SKIP', reason: 'no test user' };
      continue;
    }
    const sess = await sessionForEmail(user.email);
    if (sess.error) {
      permResults[role] = { status: 'FAIL', reason: sess.error };
      continue;
    }
    const billing = await api('/api/stripe/billing', sess.token);
    const checkout = await api('/api/stripe/checkout', sess.token, { method: 'POST' });
    const portal = await api('/api/stripe/portal', sess.token, {
      method: 'POST',
      body: JSON.stringify({ returnUrl: `${baseUrl}/workspace/${agency.slug}/billing` }),
    });
    const wizardDraft = await api('/api/agreements/wizard-draft', sess.token);
    const sendDraft = await api('/api/documents/wizard-draft', sess.token);

    const expectBillingMutate = canAccessBilling(role);
    const expectSettings = canAccessSettings(role);

    permResults[role] = {
      email: user.email,
      uiRole: UI_ROLE[role] || role,
      billingGet: billing.status,
      checkout: checkout.status,
      portal: portal.status,
      wizardDraft: wizardDraft.status,
      sendDocDraft: sendDraft.status,
      expectedCheckout: expectBillingMutate ? 'not 403' : 403,
      checkoutOk: expectBillingMutate ? checkout.status !== 403 : checkout.status === 403,
      expectedSettingsDraft: expectSettings ? 'ok' : 'restricted in UI',
    };
  }
  report.sections.permissions = permResults;

  // 6. Settings DB sync
  const settingsTables = [
    'branding_settings',
    'rmas',
    'matter_types',
    'matter_type_fields',
    'agreement_clauses',
    'payment_schedules',
    'matter_defaults',
  ];
  const settingsProbe = {};
  for (const table of settingsTables) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency.id);
    settingsProbe[table] = error ? { ok: false, error: error.message } : { ok: true, count };
  }
  report.sections.settingsDb = settingsProbe;

  // SignWell / agreements DB
  const { data: agreements } = await admin
    .from('agreements')
    .select('id, status, signwell_document_id, agent_signed_at, agent_signature_url')
    .eq('agency_id', agency.id)
    .order('updated_at', { ascending: false })
    .limit(5);

  const { data: docs } = await admin
    .from('documents')
    .select('id, signwell_document_id, signwell_status, sender_signed_at')
    .eq('agency_id', agency.id)
    .not('signwell_document_id', 'is', null)
    .limit(5);

  report.sections.signwellDb = {
    agreementsWithSignwell: (agreements || []).filter((a) => a.signwell_document_id).length,
    agreementsWithAgentSig: (agreements || []).filter((a) => a.agent_signed_at).length,
    documentsWithSignwell: (docs || []).length,
    sampleAgreement: agreements?.[0] || null,
    sampleDocument: docs?.[0] || null,
  };

  // Application approvals RLS smoke (service role insert as agent would need user JWT - use owner)
  const owner = roleUsers.owner || users?.find((u) => u.role === 'owner');
  if (owner && serverUp) {
    const sess = await sessionForEmail(owner.email);
    if (!sess.error) {
      const approvalsList = await fetch(`${baseUrl}/workspace/${agency.slug}/approvals`, {
        headers: { Authorization: `Bearer ${sess.token}` },
      });
      report.sections.applicationApprovals = {
        pageStatus: approvalsList.status,
        canManageDb: canManageApprovalsDb('owner'),
      };
    }
  }

  // Owner API deep tests when server up
  if (serverUp && owner?.email) {
    const sess = await sessionForEmail(owner.email);
    if (!sess.error) {
      const seats = await api('/api/stripe/seats?role=agent', sess.token);
      const usage = await api('/api/stripe/usage', sess.token);
      const sig = await api('/api/signatures', sess.token);
      const preview = await api('/api/documents/send-document-preview', sess.token, {
        method: 'POST',
        body: JSON.stringify({ agencyId: agency.id, documentName: 'Phase11.4 Test' }),
      });

      report.sections.ownerApis = {
        seats: seats.status,
        usage: usage.status,
        signatures: sig.status,
        attestationPreview: preview.status,
        attestationHasUrl: Boolean(preview.body?.previewUrl),
      };

      // Agreement wizard draft round-trip
      const putDraft = await api('/api/agreements/wizard-draft', sess.token, {
        method: 'PUT',
        body: JSON.stringify({
          formData: { clientName: 'Phase11.4', clientEmail: 'phase114@test.com' },
          currentStep: 2,
          agreementRef: 'TST-REF',
        }),
      });
      const getDraft = await api('/api/agreements/wizard-draft', sess.token);
      report.sections.agreementWizard = {
        draftPut: putDraft.status,
        draftGet: getDraft.status,
        draftPersisted: getDraft.body?.draft?.form_data?.clientName === 'Phase11.4',
      };
    }
  }

  // Score (rough)
  let points = 0;
  if (report.sections.database?.migrationVerify === 'PASS') points += 15;
  if (serverUp) points += 10;
  else points += 0;
  const permOk = Object.values(permResults).filter((p) => p.checkoutOk !== false).length;
  points += Math.min(15, permOk * 2);
  const settingsOk = Object.values(settingsProbe).filter((s) => s.ok).length;
  points += Math.min(15, settingsOk * 2);
  if (report.sections.agreementWizard?.draftPersisted) points += 10;
  if (report.sections.ownerApis?.attestationHasUrl) points += 10;
  if (report.sections.signwellDb?.agreementsWithSignwell > 0) points += 5;
  points += stripe.status === 0 ? 10 : 5;
  report.score = Math.min(100, points);
  report.launchReadinessScore = report.score;

  const outPath = path.join('docs', 'verification-screenshots', 'phase11-4-api-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  const failed = report.blockers.length > 0;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

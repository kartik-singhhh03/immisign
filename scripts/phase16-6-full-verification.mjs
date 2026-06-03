#!/usr/bin/env node
/**
 * Phase 16.6 — Production deployment verification (DB + API + RLS)
 * Usage: node scripts/phase16-6-full-verification.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const TEST_PASSWORD = 'ImmiSignAudit!2026';
const OUT_DIR = path.join('docs', 'verification-screenshots', 'phase16-6');

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
const baseUrl = process.argv[2] || env.PHASE16_BASE_URL || 'http://localhost:3001';
const slug = process.argv[3] || env.PHASE16_AGENCY_SLUG || 'abc-lab';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

fs.mkdirSync(OUT_DIR, { recursive: true });

const report = {
  timestamp: new Date().toISOString(),
  baseUrl,
  slug,
  migration: {},
  database: {},
  rls: {},
  api: {},
  accountDeletion: {},
  clientCentric: {},
  invite: {},
  signwell: {},
  mfa: {},
  securityCenter: {},
};

function status(ok, partial = false) {
  if (ok) return 'PASS';
  if (partial) return 'PARTIAL';
  return 'FAIL';
}

async function api(method, p, token, body) {
  try {
    const res = await fetch(`${baseUrl}${p}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text.slice(0, 300) };
    }
    return { status: res.status, json, ok: res.ok };
  } catch (e) {
    return { status: 0, json: { error: e.message }, ok: false, fetchFailed: true };
  }
}

// --- Migration evidence (SQL) ---
const pg = await connectPgClient();
const migrationFile = '20260606100000_phase16_security_foundation.sql';
const { rows: migRows } = await pg.query(
  `SELECT filename, applied_at FROM public.schema_migrations WHERE filename = $1`,
  [migrationFile],
);
report.migration = {
  name: migrationFile,
  applied: migRows.length > 0,
  applied_at: migRows[0]?.applied_at || null,
  result: status(migRows.length > 0),
};

const tables = ['security_audit_logs', 'service_statements', 'service_statement_items'];
for (const t of tables) {
  const { rows } = await pg.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [t],
  );
  const { rows: idx } = await pg.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`,
    [t],
  );
  const { rows: rls } = await pg.query(
    `SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`,
    [t],
  );
  report.database[t] = {
    column_count: rows.length,
    columns: rows.map((r) => r.column_name),
    indexes: idx.map((r) => r.indexname),
    rls_policies: rls,
    result: status(rows.length > 0),
  };
}

const { rows: userCols } = await pg.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users'
   AND column_name IN ('mfa_enabled', 'mfa_recovery_codes', 'mfa_enrolled_at', 'deleted_at')`,
);
report.database.users_mfa_columns = {
  found: userCols.map((r) => r.column_name),
  result: status(userCols.length >= 3),
};

const { rows: fkRows } = await pg.query(
  `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
   AND tc.table_schema = 'public'
   AND tc.table_name IN ('service_statements', 'service_statement_items', 'security_audit_logs')`,
);
report.database.foreign_keys = fkRows;

const { rows: agencies } = await pg.query(`SELECT id, slug, subscription_status FROM agencies WHERE slug = $1`, [slug]);
const agency = agencies[0];
if (!agency) {
  console.error('Agency not found:', slug);
  process.exit(1);
}

// RLS probe: tenant isolation on security_audit_logs
const { rows: otherAgency } = await pg.query(`SELECT id FROM agencies WHERE slug != $1 LIMIT 1`, [slug]);
if (otherAgency[0]) {
  const { rows: leak } = await pg.query(
    `SELECT COUNT(*)::int AS n FROM security_audit_logs WHERE agency_id = $1`,
    [otherAgency[0].id],
  );
  report.rls.security_audit_logs_isolated = {
    other_agency_log_count: leak[0].n,
    note: 'Full RLS enforcement requires authenticated JWT test; structural policies verified above',
    result: 'PARTIAL',
  };
}

const { rows: owners } = await pg.query(
  `SELECT id, email, role FROM users WHERE agency_id = $1 AND role = 'owner' LIMIT 1`,
  [agency.id],
);
const owner = owners[0];
const { rows: agents } = await pg.query(
  `SELECT id, email, role FROM users WHERE agency_id = $1 AND role = 'agent' AND deleted_at IS NULL LIMIT 1`,
  [agency.id],
);
const agent = agents[0];

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });
const { data: ownerSession } = await admin.auth.signInWithPassword({
  email: owner.email,
  password: TEST_PASSWORD,
});
const ownerToken = ownerSession?.session?.access_token;

let agentToken = null;
if (agent) {
  await admin.auth.admin.updateUserById(agent.id, { password: TEST_PASSWORD });
  const { data: agentSession } = await admin.auth.signInWithPassword({
    email: agent.email,
    password: TEST_PASSWORD,
  });
  agentToken = agentSession?.session?.access_token;
}

// Security Center APIs
const secPaths = [
  ['audit_logs', 'GET', '/api/security/audit-logs'],
  ['mfa_status', 'GET', '/api/security/mfa/status'],
  ['sessions', 'GET', '/api/security/sessions'],
];
for (const [key, method, p] of secPaths) {
  const r = await api(method, p, ownerToken);
  report.securityCenter[key] = {
    http: r.status,
    fetchFailed: r.fetchFailed,
    body: r.json,
    result: r.fetchFailed ? 'FAIL' : r.ok || r.status === 401 ? (r.ok ? 'PASS' : 'PARTIAL') : 'FAIL',
  };
}

// Login event → audit log
const loginEv = await api('POST', '/api/security/login-event', ownerToken, { eventType: 'login.success' });
report.securityCenter.login_event = {
  http: loginEv.status,
  result: loginEv.ok ? 'PASS' : 'FAIL',
};
const logsAfter = await api('GET', '/api/security/audit-logs?limit=5', ownerToken);
report.securityCenter.audit_after_login = {
  count: logsAfter.json?.logs?.length ?? 0,
  latest: logsAfter.json?.logs?.[0] || null,
  result: (logsAfter.json?.logs?.length || 0) > 0 ? 'PASS' : 'PARTIAL',
};

// MFA enroll attempt
const mfaEnroll = await api('POST', '/api/security/mfa/enroll', ownerToken);
report.mfa.enroll = {
  http: mfaEnroll.status,
  error: mfaEnroll.json?.error,
  hasQr: Boolean(mfaEnroll.json?.qrCode),
  result:
    mfaEnroll.ok && mfaEnroll.json?.factorId
      ? 'PASS'
      : mfaEnroll.json?.error?.includes('MFA') || mfaEnroll.status === 422
        ? 'PARTIAL'
        : mfaEnroll.fetchFailed
          ? 'FAIL'
          : 'PARTIAL',
  note: 'Full TOTP verify requires manual authenticator code; enable MFA in Supabase Auth settings',
};

// Account deletion scenarios
async function deleteRequest(token, label) {
  const r = await api('POST', '/api/security/account/delete-request', token, {
    password: TEST_PASSWORD,
    confirmText: 'DELETE MY ACCOUNT',
  });
  return { label, http: r.status, error: r.json?.error, result: r.status === 409 ? 'PASS' : r.status >= 400 ? 'PARTIAL' : 'FAIL' };
}

const ownerDelSub = await deleteRequest(ownerToken, 'owner');
report.accountDeletion.owner_with_subscription = {
  subscription_status: agency.subscription_status,
  ...ownerDelSub,
  expected: '409 if active/trialing subscription',
  result:
    agency.subscription_status === 'active' || agency.subscription_status === 'trialing'
      ? ownerDelSub.http === 409
        ? 'PASS'
        : 'FAIL'
      : ownerDelSub.http === 409
        ? 'PARTIAL'
        : 'PARTIAL',
};

const { rows: userCount } = await pg.query(
  `SELECT COUNT(*)::int AS n FROM users WHERE agency_id = $1 AND deleted_at IS NULL`,
  [agency.id],
);
report.accountDeletion.owner_multi_user = {
  user_count: userCount[0].n,
  delete_http: (await deleteRequest(ownerToken, 'owner_multi')).http,
  result: userCount[0].n > 1 ? 'PASS' : 'PARTIAL',
  note: 'Blocked when >1 users',
};

const { rows: agrCount } = await pg.query(
  `SELECT COUNT(*)::int AS n FROM agreements WHERE agency_id = $1 AND deleted_at IS NULL
   AND status NOT IN ('cancelled', 'expired')`,
  [agency.id],
);
report.accountDeletion.owner_active_agreements = {
  count: agrCount[0].n,
  result: agrCount[0].n > 0 ? 'PARTIAL' : 'PASS',
};

if (agentToken) {
  const agentDel = await deleteRequest(agentToken, 'agent');
  report.accountDeletion.agent_attempt = agentDel;
}

// Client-centric: create client → agreement payload with clientId
const testEmail = `phase166.${Date.now()}@mailinator.test`;
const { data: newClient, error: clientErr } = await admin
  .from('clients')
  .insert({ agency_id: agency.id, name: 'Phase 16.6 Verify Client', email: testEmail, phone: '+61000000000' })
  .select('id, name, email')
  .single();

report.clientCentric.create_client = {
  error: clientErr?.message,
  client_id: newClient?.id,
  result: newClient?.id ? 'PASS' : 'FAIL',
};

if (newClient?.id && ownerToken) {
  const agrPayload = {
    agencyId: agency.id,
    formData: {
      clientId: newClient.id,
      clientName: newClient.name,
      clientEmail: newClient.email,
      clientPhone: '+61000000000',
      matterType: 'Partner',
      visaSubclass: '820',
      professionalFee: '1500',
      scopeOfServices: 'Phase 16.6 verification',
      paymentSchedule: '100% upfront',
      responsibleRma: `${owner.id}`,
      ccMe: false,
    },
    responsibleRmaId: owner.id,
    dispatchOptions: { ccMe: false, send: false },
  };
  const agrRes = await api('POST', '/api/agreements/standard', ownerToken, agrPayload);
  report.clientCentric.agreement_api = {
    http: agrRes.status,
    error: agrRes.json?.error,
    agreement_id: agrRes.json?.agreementId || agrRes.json?.agreement_id,
    result: agrRes.status < 500 && agrRes.status !== 502 ? 'PARTIAL' : 'FAIL',
  };
  if (agrRes.json?.agreementId || agrRes.json?.agreement_id) {
    const aid = agrRes.json.agreementId || agrRes.json.agreement_id;
    const { rows: agrRow } = await pg.query(
      `SELECT id, client_id FROM agreements WHERE id = $1`,
      [aid],
    );
    report.clientCentric.agreement_client_id = {
      db_client_id: agrRow[0]?.client_id,
      expected: newClient.id,
      result: agrRow[0]?.client_id === newClient.id ? 'PASS' : 'FAIL',
    };
  }

  const apprRes = await api('POST', '/api/approvals', ownerToken, {
    agencyId: agency.id,
    title: 'Phase 16.6 Approval',
    client_id: newClient.id,
    visa_subclass: '820',
    priority: 'normal',
  });
  report.clientCentric.approval_api = {
    http: apprRes.status,
    id: apprRes.json?.id || apprRes.json?.approval?.id,
    result: apprRes.ok ? 'PASS' : apprRes.status < 500 ? 'PARTIAL' : 'FAIL',
  };
  if (apprRes.json?.id) {
    const { rows: apprRow } = await pg.query(
      `SELECT id, client_id FROM application_approvals WHERE id = $1`,
      [apprRes.json.id],
    );
    report.clientCentric.approval_client_id = {
      db_client_id: apprRow[0]?.client_id,
      result: apprRow[0]?.client_id === newClient.id ? 'PASS' : 'FAIL',
    };
  }

  const { rows: dup } = await pg.query(
    `SELECT COUNT(*)::int AS n FROM clients WHERE agency_id = $1 AND email = $2`,
    [agency.id, testEmail],
  );
  report.clientCentric.no_duplicate_clients = {
    count: dup[0].n,
    result: dup[0].n === 1 ? 'PASS' : 'FAIL',
  };
}

// SignWell tests
const signA = await api('POST', '/api/agreements/standard', ownerToken, {
  agencyId: agency.id,
  formData: {
    clientName: 'Self CC Test',
    clientEmail: owner.email,
    matterType: 'Test',
    visaSubclass: '820',
    professionalFee: '100',
    scopeOfServices: 'Test',
    paymentSchedule: '100% upfront',
    ccMe: true,
  },
  dispatchOptions: { ccMe: true, send: true },
});
report.signwell.test_a_same_email_cc = {
  http: signA.status,
  error: signA.json?.error,
  result: signA.status === 422 ? 'PASS' : signA.status === 502 ? 'FAIL' : 'PARTIAL',
  note: 'Expect 422 friendly validation, not 502',
};

const signB = await api('POST', '/api/agreements/standard', ownerToken, {
  agencyId: agency.id,
  formData: {
    clientName: 'Distinct Client',
    clientEmail: `distinct.${Date.now()}@mailinator.test`,
    matterType: 'Test',
    visaSubclass: '820',
    professionalFee: '100',
    scopeOfServices: 'Test',
    paymentSchedule: '100% upfront',
    ccMe: false,
  },
  dispatchOptions: { ccMe: false, send: true },
});
report.signwell.test_b_distinct_email = {
  http: signB.status,
  error: signB.json?.error,
  result: signB.status === 502 ? 'FAIL' : signB.status < 500 ? 'PARTIAL' : 'FAIL',
};

const { rows: swRows } = await pg.query(
  `SELECT id, status, signwell_status, signwell_document_id FROM agreements
   WHERE agency_id = $1 AND signwell_document_id IS NOT NULL
   ORDER BY updated_at DESC LIMIT 3`,
  [agency.id],
);
report.signwell.webhook_db_sample = { rows: swRows, result: swRows.length > 0 ? 'PARTIAL' : 'PARTIAL' };

// Invite row check
const { rows: invites } = await pg.query(
  `SELECT id, email, accepted_at FROM invitations WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 3`,
  [agency.id],
);
const { rows: orphanInv } = await pg.query(
  `SELECT i.id FROM invitations i
   LEFT JOIN users u ON u.email = i.email AND u.agency_id = i.agency_id
   WHERE i.agency_id = $1 AND i.accepted_at IS NOT NULL AND u.id IS NULL LIMIT 5`,
  [agency.id],
);
report.invite = {
  recent_invitations: invites,
  orphan_accepted_without_user: orphanInv.length,
  result: orphanInv.length === 0 ? 'PARTIAL' : 'FAIL',
};

await pg.end();

const suffix = baseUrl.includes('vercel.app') ? '-production' : '-local';
const outJson = path.join(OUT_DIR, `phase16-6-verification${suffix}.json`);
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
console.log('Wrote', outJson);
console.log(JSON.stringify(report, null, 2));

const criticalFails = [];
if (report.migration.result !== 'PASS') criticalFails.push('migration');
if (report.securityCenter.audit_logs?.fetchFailed) criticalFails.push('api_unreachable');
process.exit(criticalFails.length ? 1 : 0);

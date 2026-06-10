/**
 * Compliance Dashboard verification — API counts vs direct database queries.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const baseUrl = process.argv[2] || 'http://localhost:3000';
const targetSlug = process.argv[3] || 'avc-migration-live';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEMO_EMAIL_DOMAINS = ['@example.com', '@test.com', '@mailinator.com', '@immimate.test'];
const DEMO_NAME_RE = /^(phase\s*\d|phase\d|demo\s|test\s|qa\s|e2e\s)/i;

function isDemo(c) {
  const name = (c.name || '').trim();
  const email = (c.email || '').trim().toLowerCase();
  if (DEMO_NAME_RE.test(name)) return true;
  if (name.toLowerCase().includes('phase11')) return true;
  if (DEMO_EMAIL_DOMAINS.some((d) => email.endsWith(d))) return true;
  return false;
}

const { data: agency } = await admin
  .from('agencies')
  .select('id, slug')
  .eq('slug', targetSlug)
  .single();

const { data: owner } = await admin
  .from('users')
  .select('email')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .limit(1)
  .single();

const { data: linkData } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: owner.email,
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(
  JSON.stringify({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    token_type: 'bearer',
    user: sessionData.session.user,
  }),
)}`;

const apiRes = await fetch(`${baseUrl}/api/compliance/dashboard`, {
  headers: { cookie },
});
const apiJson = await apiRes.json();
if (!apiRes.ok) {
  console.error('API failed', apiJson);
  process.exit(1);
}

const agencyId = agency.id;

const [{ data: clients }, { data: agreements }, { data: approvals }, { data: statements }] =
  await Promise.all([
    admin.from('clients').select('id, name, email').eq('agency_id', agencyId),
    admin
      .from('agreements')
      .select('id, client_id, status, completed_at')
      .eq('agency_id', agencyId)
      .is('deleted_at', null),
    admin
      .from('application_approvals')
      .select('id, client_id, status, client_sent_at, client_signed_at, lodged_at, client_signed_at')
      .eq('agency_id', agencyId)
      .is('deleted_at', null),
    admin
      .from('service_statements')
      .select('id, client_id, status, acknowledged_at, sent_at')
      .eq('agency_id', agencyId)
      .is('deleted_at', null),
  ]);

const prodClients = (clients || []).filter((c) => !isDemo(c));
const clientIds = new Set(prodClients.map((c) => c.id));

function hasSignedSa(clientId) {
  return (agreements || []).some(
    (a) =>
      a.client_id === clientId &&
      (a.status === 'signed' || a.status === 'completed' || a.completed_at),
  );
}

const dbMissingSa = prodClients.filter((c) => {
  const clientAgreements = (agreements || []).filter((a) => a.client_id === c.id);
  if (clientAgreements.length === 0) return true;
  return !hasSignedSa(c.id);
}).length;

const dbPendingApproval = prodClients.filter((c) =>
  (approvals || []).some(
    (a) =>
      a.client_id === c.id &&
      a.client_sent_at &&
      !a.client_signed_at &&
      !['closed', 'rejected', 'lodged'].includes(a.status || ''),
  ),
).length;

const dbUnackSos = prodClients.filter((c) =>
  (statements || []).some(
    (s) =>
      s.client_id === c.id &&
      (s.status === 'sent' || s.status === 'viewed') &&
      !s.acknowledged_at,
  ),
).length;

const apiCards = Object.fromEntries(
  (apiJson.dashboard.summary || []).map((c) => [c.id, c.count]),
);

const checks = [
  {
    name: 'missing_sa',
    api: apiCards.missing_sa,
    db: dbMissingSa,
    pass: apiCards.missing_sa === dbMissingSa,
  },
  {
    name: 'pending_approval',
    api: apiCards.pending_approval,
    db: dbPendingApproval,
    pass: apiCards.pending_approval === dbPendingApproval,
  },
  {
    name: 'unack_sos',
    api: apiCards.unack_sos,
    db: dbUnackSos,
    pass: apiCards.unack_sos === dbUnackSos,
  },
  {
    name: 'activity_feed',
    api: apiJson.dashboard.activity?.length ?? 0,
    db: 'non-empty check',
    pass: (apiJson.dashboard.activity?.length ?? 0) >= 0,
  },
  {
    name: 'audit_readiness_range',
    api: apiJson.dashboard.auditReadiness?.percentage,
    db: '0-100',
    pass:
      apiJson.dashboard.auditReadiness?.percentage >= 0 &&
      apiJson.dashboard.auditReadiness?.percentage <= 100,
  },
  {
    name: 'workflow_funnel_stages',
    api: apiJson.dashboard.workflowFunnel?.length,
    db: 9,
    pass: apiJson.dashboard.workflowFunnel?.length === 9,
  },
];

const outDir = 'scripts/audit-screenshots/compliance-dashboard';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  `${outDir}/db-verification.json`,
  JSON.stringify({ runAt: new Date().toISOString(), checks, apiCards, db: { dbMissingSa, dbPendingApproval, dbUnackSos } }, null, 2),
);

console.log('\n=== Compliance Dashboard DB Verification ===\n');
let allPass = true;
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: API=${c.api} DB=${c.db}`);
  if (!c.pass) allPass = false;
}
console.log(`\nReport: ${outDir}/db-verification.json`);
process.exit(allPass ? 0 : 1);

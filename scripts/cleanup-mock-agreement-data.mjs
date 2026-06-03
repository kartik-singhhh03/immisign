import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_AGENCY_ID = '11111111-1111-1111-1111-111111111111';
const mode = (process.argv[2] || 'dry-run').toLowerCase();

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const demoPatterns = [
  '%Gurpreet%',
  '%Harpreet%',
  '%Phase3%',
  '%Phase4%',
  '%Phase4C%',
  '%Phase6%',
  '%E2E Verification Client%',
  '%E2E Test Client%',
  '%E2E Client%',
  '%Test Scratch%',
  '%demo%',
  '%test client%',
  '%@example.com%',
  '%@test.com%',
  '%scratchclient%',
];

async function auditAgency(agencyId) {
  const orFilter = demoPatterns.map((p) => `client_name.ilike.${p},title.ilike.${p}`).join(',');
  const { data: agreements, count: agreementCount } = await supabase
    .from('agreements')
    .select('id,client_name,title,agreement_number', { count: 'exact' })
    .eq('agency_id', agencyId)
    .or(orFilter);

  const { data: clients, count: clientCount } = await supabase
    .from('clients')
    .select('id,name,email', { count: 'exact' })
    .eq('agency_id', agencyId)
    .or(demoPatterns.map((p) => `name.ilike.${p},email.ilike.${p}`).join(','));

  return { agencyId, agreementCount: agreementCount || 0, agreements: agreements || [], clientCount: clientCount || 0, clients: clients || [] };
}

const { data: agencies } = await supabase.from('agencies').select('id,name,slug');
const audits = [];
for (const agency of agencies || []) {
  audits.push({ ...(await auditAgency(agency.id)), name: agency.name, slug: agency.slug });
}

console.log('MOCK_DATA_AUDIT', JSON.stringify(audits, null, 2));

if (mode !== 'apply') {
  console.log('MODE', 'dry-run — pass "apply" to delete mock rows');
  process.exit(0);
}

for (const audit of audits) {
  if (audit.agreements.length) {
    const ids = audit.agreements.map((x) => x.id);
    await supabase.from('payment_schedules').delete().in('agreement_id', ids);
    await supabase.from('agreement_participants').delete().in('agreement_id', ids);
    await supabase.from('signers').delete().in('agreement_id', ids);
    await supabase.from('documents').delete().in('agreement_id', ids);
    await supabase.from('activity_logs').delete().in('reference_id', ids);
    const { error } = await supabase.from('agreements').delete().in('id', ids);
    if (error) console.error('AGREEMENT_DELETE_ERROR', audit.agencyId, error.message);
  }
  if (audit.clients.length) {
    const ids = audit.clients.map((x) => x.id);
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (error) console.error('CLIENT_DELETE_ERROR', audit.agencyId, error.message);
  }
}

if (mode === 'apply') {
  const { count: placeholderUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', PLACEHOLDER_AGENCY_ID);
  if ((placeholderUsers || 0) === 0) {
    await supabase.from('agencies').delete().eq('id', PLACEHOLDER_AGENCY_ID);
    console.log('REMOVED_PLACEHOLDER_AGENCY', PLACEHOLDER_AGENCY_ID);
  } else {
    console.log('SKIPPED_PLACEHOLDER_AGENCY_DELETE', 'users still linked');
  }
}

console.log('CLEANUP_COMPLETE');

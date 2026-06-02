import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const mode = (process.argv[2] || 'dry-run').toLowerCase();
const agencyId = process.argv[3] || '';
if (!agencyId) {
  console.log('USAGE', 'node scripts/phase6c-demo-data-cleanup.mjs <dry-run|apply> <agency_id>');
  process.exit(1);
}

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

const patterns = ['%Gurpreet%', '%Phase3%', '%Phase4%', '%E2E Verification Client%'];

const queries = await Promise.all([
  supabase.from('agreements').select('id,title,client_name,agreement_number', { count: 'exact' }).eq('agency_id', agencyId).or(
    `title.ilike.${patterns[0]},title.ilike.${patterns[1]},title.ilike.${patterns[2]},title.ilike.${patterns[3]},client_name.ilike.${patterns[0]},agreement_number.ilike.%AGR-%`
  ),
  supabase.from('clients').select('id,name,email', { count: 'exact' }).eq('agency_id', agencyId).or(
    `name.ilike.${patterns[0]},name.ilike.${patterns[3]}`
  ),
  supabase.from('activity_logs').select('id,title,description', { count: 'exact' }).eq('agency_id', agencyId).or(
    `title.ilike.${patterns[0]},title.ilike.${patterns[1]},title.ilike.${patterns[2]},description.ilike.${patterns[0]},description.ilike.${patterns[1]},description.ilike.${patterns[2]}`
  ),
]);

const [agreementsRes, clientsRes, logsRes] = queries;
console.log('DEMO_DATA_AUDIT', JSON.stringify({
  agreements: agreementsRes.data || [],
  agreementsCount: agreementsRes.count || 0,
  clients: clientsRes.data || [],
  clientsCount: clientsRes.count || 0,
  activityLogs: logsRes.data || [],
  activityLogsCount: logsRes.count || 0,
}, null, 2));

if (mode !== 'apply') {
  console.log('MODE', 'dry-run complete');
  process.exit(0);
}

if (agreementsRes.data?.length) {
  const ids = agreementsRes.data.map((x) => x.id);
  await supabase.from('payment_schedules').delete().in('agreement_id', ids);
  await supabase.from('agreement_participants').delete().in('agreement_id', ids);
  await supabase.from('signers').delete().in('agreement_id', ids);
  await supabase.from('documents').delete().in('agreement_id', ids);
  await supabase.from('agreements').delete().in('id', ids);
}
if (clientsRes.data?.length) {
  const ids = clientsRes.data.map((x) => x.id);
  await supabase.from('clients').delete().in('id', ids);
}
if (logsRes.data?.length) {
  const ids = logsRes.data.map((x) => x.id);
  await supabase.from('activity_logs').delete().in('id', ids);
}

console.log('MODE', 'apply complete');

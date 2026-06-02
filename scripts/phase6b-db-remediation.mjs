import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_AGENCY_ID = '11111111-1111-1111-1111-111111111111';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
  }
  return env;
}

async function getExistingTables(supabase) {
  const candidates = ['users', 'agencies', 'workspaces', 'profiles'];
  const existing = [];
  for (const table of candidates) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) existing.push(table);
  }
  return existing;
}

async function countByTable(supabase, table) {
  if (table === 'agencies') {
    const { count } = await supabase.from('agencies').select('*', { count: 'exact', head: true }).eq('id', PLACEHOLDER_AGENCY_ID);
    return count || 0;
  }
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('agency_id', PLACEHOLDER_AGENCY_ID);
  return count || 0;
}

async function main() {
  const mode = (process.argv[2] || 'dry-run').toLowerCase();
  const targetAgencyArg = process.argv[3] || '';
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingTables = await getExistingTables(supabase);
  const counts = [];
  for (const table of existingTables) {
    counts.push({ table, rowCount: await countByTable(supabase, table) });
  }

  const { data: affectedUsers, error: usersError } = await supabase
    .from('users')
    .select('id,email,agency_id,role,is_active')
    .eq('agency_id', PLACEHOLDER_AGENCY_ID)
    .order('email', { ascending: true });

  if (usersError) {
    console.log('USERS_AUDIT_ERROR', usersError.message);
    process.exit(1);
  }

  const { data: realAgencyCandidates, error: agencyErr } = await supabase
    .from('agencies')
    .select('id,name,slug,created_at')
    .ilike('name', '%AVC Migration%')
    .neq('id', PLACEHOLDER_AGENCY_ID)
    .order('created_at', { ascending: false });

  if (agencyErr) {
    console.log('REAL_AGENCY_LOOKUP_ERROR', agencyErr.message);
    process.exit(1);
  }

  let realAgency = realAgencyCandidates?.[0] || null;
  if (targetAgencyArg) {
    const { data: forcedAgency, error: forcedErr } = await supabase
      .from('agencies')
      .select('id,name,slug,created_at')
      .eq('id', targetAgencyArg)
      .single();
    if (forcedErr || !forcedAgency) {
      console.log('FORCED_AGENCY_ERROR', forcedErr?.message || 'agency not found');
      process.exit(1);
    }
    realAgency = forcedAgency;
  }

  console.log('AUDIT_TABLE_COUNTS', JSON.stringify(counts, null, 2));
  console.log('AUDIT_AFFECTED_USERS', JSON.stringify(affectedUsers, null, 2));
  console.log('REAL_AGENCY_CANDIDATE', JSON.stringify(realAgency, null, 2));

  if (!realAgency) {
    console.log('REMEDIATION_ABORTED', 'No non-placeholder AVC Migration agency found.');
    process.exit(1);
  }

  const usersToMove = (affectedUsers || []).filter((u) => u.is_active !== false);
  const dryRunMap = usersToMove.map((u) => ({
    user: u.email,
    old_agency_id: u.agency_id,
    new_agency_id: realAgency.id,
  }));
  console.log('DRY_RUN_USER_MOVES', JSON.stringify(dryRunMap, null, 2));

  if (mode !== 'apply') {
    console.log('MODE', 'dry-run complete');
    return;
  }

  if (usersToMove.length === 0) {
    console.log('MODE', 'apply no-op, no active users on placeholder agency');
    return;
  }

  const userIds = usersToMove.map((u) => u.id);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ agency_id: realAgency.id, updated_at: new Date().toISOString() })
    .in('id', userIds);

  if (updateErr) {
    console.log('APPLY_USERS_UPDATE_ERROR', updateErr.message);
    process.exit(1);
  }

  const { data: verifyUsers, error: verifyErr } = await supabase
    .from('users')
    .select('id,email,agency_id,role,is_active')
    .in('id', userIds)
    .order('email', { ascending: true });

  if (verifyErr) {
    console.log('APPLY_VERIFY_ERROR', verifyErr.message);
    process.exit(1);
  }

  console.log('APPLY_SUCCESS_USERS', JSON.stringify(verifyUsers, null, 2));
}

await main();

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function env() {
  const out = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    out[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
  }
  return out;
}

async function updateIfTable(supabase, table, column, oldId, newId) {
  const head = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
  if (head.error) return { table, updated: 0, skipped: true };
  const { error } = await supabase.from(table).update({ [column]: newId }).eq(column, oldId);
  if (error) return { table, updated: 0, error: error.message };
  return { table, updated: 1 };
}

async function getAuthUserByEmail(supabase, email) {
  const pageSize = 200;
  let page = 1;
  while (true) {
    const res = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
    if (res.error) return null;
    const users = res.data?.users || [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < pageSize) return null;
    page += 1;
  }
}

const mode = (process.argv[2] || 'dry-run').toLowerCase();
const e = env();
const supabase = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users, error: usersErr } = await supabase
  .from('users')
  .select('id,email,full_name,role,agency_id,is_active')
  .or('id.eq.22222222-2222-2222-2222-222222222221,id.eq.22222222-2222-2222-2222-222222222222,id.eq.22222222-2222-2222-2222-222222222223,id.eq.22222222-2222-2222-2222-222222222224,id.eq.22222222-2222-2222-2222-222222222225,id.eq.22222222-2222-2222-2222-222222222226')
  .order('email', { ascending: true });

if (usersErr) {
  console.log('USER_ID_AUDIT_ERROR', usersErr.message);
  process.exit(1);
}

console.log('PLACEHOLDER_USER_ROWS', JSON.stringify(users, null, 2));

if (!users?.length) {
  console.log('NO_PLACEHOLDER_USER_IDS_FOUND');
  process.exit(0);
}

if (mode !== 'apply') {
  console.log('MODE', 'dry-run complete');
  process.exit(0);
}

const mapping = [];
for (const row of users) {
  const oldId = row.id;
  let newId = oldId;
  let temporaryPassword = null;
  const existingAuth = await getAuthUserByEmail(supabase, row.email);
  if (existingAuth && existingAuth.id !== oldId) {
    newId = existingAuth.id;
  } else if (!existingAuth) {
    temporaryPassword = `Pass!${Math.random().toString(36).slice(2, 10)}A1`;
    const created = await supabase.auth.admin.createUser({
      email: row.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: row.full_name },
    });
    if (created.error || !created.data.user) {
      console.log('CREATE_AUTH_USER_ERROR', row.email, created.error?.message || 'unknown');
      continue;
    }
    newId = created.data.user.id;
  }

  if (newId !== oldId) {
    const existingPublic = await supabase.from('users').select('id').eq('id', newId).maybeSingle();
    if (existingPublic.error || !existingPublic.data) {
      const ins = await supabase.from('users').insert({
        id: newId,
        agency_id: row.agency_id,
        full_name: row.full_name,
        email: row.email,
        role: row.role,
        is_active: row.is_active,
        email_verified: true,
      });
      if (ins.error) {
        console.log('INSERT_NEW_USER_ROW_ERROR', row.email, ins.error.message);
        continue;
      }
    } else {
      await supabase.from('users').update({
        agency_id: row.agency_id,
        full_name: row.full_name,
        email: row.email,
        role: row.role,
        is_active: row.is_active,
      }).eq('id', newId);
    }
  }

  const updates = [];
  updates.push(await updateIfTable(supabase, 'agreements', 'created_by', oldId, newId));
  updates.push(await updateIfTable(supabase, 'documents', 'uploaded_by', oldId, newId));
  updates.push(await updateIfTable(supabase, 'invitations', 'created_by', oldId, newId));
  updates.push(await updateIfTable(supabase, 'activity_logs', 'user_id', oldId, newId));
  updates.push(await updateIfTable(supabase, 'audit_logs', 'user_id', oldId, newId));
  updates.push(await updateIfTable(supabase, 'agreement_participants', 'user_id', oldId, newId));
  updates.push(await updateIfTable(supabase, 'rmas', 'user_id', oldId, newId));
  updates.push(await updateIfTable(supabase, 'notifications', 'user_id', oldId, newId));
  updates.push(await updateIfTable(supabase, 'application_approvals', 'created_by', oldId, newId));

  if (newId !== oldId) {
    await supabase.from('users').delete().eq('id', oldId);
    await supabase.auth.admin.deleteUser(oldId);
  }

  mapping.push({ email: row.email, oldId, newId, temporaryPassword, updates });
}

console.log('USER_ID_REMEDIATION_MAPPING', JSON.stringify(mapping, null, 2));

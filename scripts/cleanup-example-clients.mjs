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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const slug = process.argv[2] || 'ritiklabs';
const { data: agency } = await admin.from('agencies').select('id').eq('slug', slug).single();
const { data: bad } = await admin
  .from('clients')
  .select('id, name, email')
  .eq('agency_id', agency.id)
  .or('email.ilike.%@example.com%,email.ilike.%@test.com%,name.ilike.%E2E%,name.ilike.%demo%');

console.log('Found', bad?.length || 0, 'demo-pattern clients');
for (const c of bad || []) {
  const { data: agrs } = await admin.from('agreements').select('id').eq('client_id', c.id);
  for (const a of agrs || []) {
    await admin.from('documents').delete().eq('agreement_id', a.id);
    await admin.from('agreement_signatures').delete().eq('agreement_id', a.id);
    await admin.from('agreements').delete().eq('id', a.id);
    console.log('  removed agreement', a.id);
  }
  const { data: apprs } = await admin.from('application_approvals').select('id').eq('client_id', c.id);
  for (const a of apprs || []) {
    await admin.from('application_approvals').delete().eq('id', a.id);
    console.log('  removed approval', a.id);
  }
  const { error } = await admin.from('clients').delete().eq('id', c.id);
  if (error) {
    const archivedEmail = `archived.${c.id.slice(0, 8)}@ritiklabs.internal`;
    const { error: updErr } = await admin
      .from('clients')
      .update({ email: archivedEmail, name: 'Archived test client', updated_at: new Date().toISOString() })
      .eq('id', c.id);
    console.log('ARCHIVE', c.id, c.email, '->', archivedEmail, updErr?.message || 'ok');
  } else {
    console.log('DELETE', c.id, c.email, 'ok');
  }
}

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const mode = (process.argv[2] || 'dry-run').toLowerCase();
const agencyId = process.argv[3] || '1cd4007e-bbe1-4205-9481-233e2fe90ee7';
const newName = process.argv[4] || 'AVC Migration';
const newSlug = process.argv[5] || 'avc-migration';

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

const { data: current, error } = await supabase
  .from('agencies')
  .select('id,name,slug')
  .eq('id', agencyId)
  .single();

if (error || !current) {
  console.log('AGENCY_LOOKUP_ERROR', error?.message || 'not found');
  process.exit(1);
}

console.log('AGENCY_BEFORE', JSON.stringify(current, null, 2));
console.log('AGENCY_AFTER', JSON.stringify({ id: agencyId, name: newName, slug: newSlug }, null, 2));

if (mode !== 'apply') {
  console.log('MODE', 'dry-run complete');
  process.exit(0);
}

const { error: upErr } = await supabase
  .from('agencies')
  .update({ name: newName, slug: newSlug })
  .eq('id', agencyId);

if (upErr) {
  console.log('AGENCY_UPDATE_ERROR', upErr.message);
  process.exit(1);
}

const { data: after } = await supabase
  .from('agencies')
  .select('id,name,slug')
  .eq('id', agencyId)
  .single();

console.log('AGENCY_UPDATED', JSON.stringify(after, null, 2));

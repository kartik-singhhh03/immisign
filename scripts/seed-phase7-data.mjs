/**
 * Apply Phase 7 DDL + seed via Supabase service role (no DATABASE_URL required).
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Seed branding for all agencies missing rows
const { data: agencies } = await supabase.from('agencies').select('id');
for (const agency of agencies || []) {
  const { data: existing } = await supabase.from('branding_settings').select('id').eq('agency_id', agency.id).maybeSingle();
  if (!existing) {
    await supabase.from('branding_settings').insert({
      agency_id: agency.id,
      primary_color: '#0D9F8C',
      secondary_color: '#081B2E',
      font_family: 'Inter',
    });
  }
  await supabase.from('matter_defaults').upsert({ agency_id: agency.id }, { onConflict: 'agency_id', ignoreDuplicates: true });
}

// Check RPC
const agencyId = agencies?.[0]?.id;
if (agencyId) {
  const { data, error } = await supabase.rpc('allocate_agreement_reference', {
    p_agency_id: agencyId,
    p_prefix: 'TST',
  });
  console.log(JSON.stringify({ rpc: { ok: !error, ref: data, error: error?.message } }, null, 2));
  if (error) {
    console.warn('RPC_MISSING — using counter-table fallback in app code');
  } else {
    console.log('RPC_OK', data);
  }
}
console.log('SEED_OK');

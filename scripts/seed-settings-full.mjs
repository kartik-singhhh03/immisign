/**
 * Seed settings data via Supabase service role (when migrations cannot run locally).
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CANONICAL_MATTER_TYPES = [
  'Partner Visa (Onshore/Offshore)', 'Skilled Migration', 'Employer Sponsored', 'Parent Visa',
  'Student Visa', 'Visitor Visa', 'Bridging Visa', 'Aged Dependent Relative',
  'ART Appeal / Merits Review', 'Character / Health Waiver',
];
const CANONICAL_PAYMENT_SCHEDULES = [
  '50% on engagement, balance prior to lodgement', '100% upfront on engagement',
  'Staged: 33% on engagement, 33% on lodgement, 34% on decision',
  'Hourly rate — invoiced per block of work, due within 7 days',
  'Fixed fee — as specified in this agreement',
];
const DEFAULT_SCOPE = `1. Verification of documents (estimated 5 hrs)
2. Preparation and lodgement of visa application
3. Liaison with the Department of Home Affairs
4. Advice on Department requests (s56/s57 notices)`;

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

const { data: agencies } = await supabase.from('agencies').select('id');
for (const agency of agencies || []) {
  await supabase.from('branding_settings').upsert({
    agency_id: agency.id,
    primary_color: '#0D9F8C',
    secondary_color: '#081B2E',
    font_family: 'Inter',
  }, { onConflict: 'agency_id' });

  await supabase.from('matter_defaults').upsert({
    agency_id: agency.id,
    default_scope_of_services: DEFAULT_SCOPE,
    default_special_terms: '',
    default_payment_schedule: CANONICAL_PAYMENT_SCHEDULES[0],
  }, { onConflict: 'agency_id' });

  const { count: mtCount } = await supabase.from('matter_types').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id);
  if (!mtCount) {
    await supabase.from('matter_types').insert(
      CANONICAL_MATTER_TYPES.map((name, idx) => ({ agency_id: agency.id, name, sort_order: idx + 1 }))
    );
  }

  const { count: psCount } = await supabase.from('agency_payment_schedules').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id);
  if (!psCount) {
    try {
      await supabase.from('agency_payment_schedules').insert(
        CANONICAL_PAYMENT_SCHEDULES.map((label, idx) => ({ agency_id: agency.id, label, sort_order: idx + 1 }))
      );
    } catch (e) {
      console.warn('agency_payment_schedules table may not exist yet — apply migration 20260603160000_settings_full_audit.sql');
    }
  }
}

console.log('SETTINGS_SEED_OK', { agencies: agencies?.length });

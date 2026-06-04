import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SCOPE = `1. Verification of documents (estimated 5 hrs)
2. Preparation and lodgement of visa application
3. Liaison with the Department of Home Affairs
4. Advice on Department requests (s56/s57 notices)`;

const PAYMENT_SCHEDULES = [
  { label: '50% on engagement, balance prior to lodgement', sort_order: 1 },
  { label: '100% upfront on engagement', sort_order: 2 },
  {
    label: 'Staged: 33% on engagement, 33% on lodgement, 34% on decision',
    sort_order: 3,
  },
  {
    label: 'Hourly rate — invoiced per block of work, due within 7 days',
    sort_order: 4,
  },
  { label: 'Fixed fee — as specified in this agreement', sort_order: 5 },
] as const;

/**
 * Ensures a new agency has tenant settings rows. The DB trigger
 * `trg_provision_agency_workspace` does the same; this is an explicit app-layer
 * guarantee during signup if migrations are applied but triggers are delayed.
 */
export async function provisionAgencyWorkspace(
  admin: SupabaseClient,
  agencyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();

  const { error: brandingError } = await admin.from('branding_settings').upsert(
    {
      agency_id: agencyId,
      primary_color: '#0D9F8C',
      secondary_color: '#081B2E',
      font_family: 'Inter',
      agreement_ref_prefix: 'AGR',
      agreement_ref_start: 1000,
      agreement_header_title: 'Migration Agent Service Agreement',
      agreement_footer_text:
        'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.',
      updated_at: now,
    },
    { onConflict: 'agency_id', ignoreDuplicates: true },
  );
  if (brandingError) return { ok: false, error: brandingError.message };

  const { error: defaultsError } = await admin.from('matter_defaults').upsert(
    {
      agency_id: agencyId,
      default_scope_of_services: DEFAULT_SCOPE,
      default_special_terms: '',
      default_payment_schedule: PAYMENT_SCHEDULES[0].label,
      updated_at: now,
    },
    { onConflict: 'agency_id', ignoreDuplicates: true },
  );
  if (defaultsError) return { ok: false, error: defaultsError.message };

  const { error: subError } = await admin.from('subscriptions').upsert(
    {
      agency_id: agencyId,
      plan_name: 'IMMISIGN',
      billing_cycle: 'monthly',
      status: 'trialing',
      included_seats: 3,
      billable_seats: 0,
      additional_seats: 0,
      updated_at: now,
    },
    { onConflict: 'agency_id', ignoreDuplicates: true },
  );
  if (subError) return { ok: false, error: subError.message };

  const { count } = await admin
    .from('agency_payment_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  if (!count) {
    const { error: schedulesError } = await admin
      .from('agency_payment_schedules')
      .insert(PAYMENT_SCHEDULES.map((s) => ({ agency_id: agencyId, ...s })));
    if (schedulesError) return { ok: false, error: schedulesError.message };
  }

  const { data: agencyRow } = await admin
    .from('agencies')
    .select('subscription_status, plan_type')
    .eq('id', agencyId)
    .maybeSingle();

  if (!agencyRow?.subscription_status || !agencyRow?.plan_type) {
    const { error: agencyError } = await admin
      .from('agencies')
      .update({
        subscription_status: agencyRow?.subscription_status || 'trialing',
        plan_type: agencyRow?.plan_type || 'IMMISIGN',
        updated_at: now,
      })
      .eq('id', agencyId);
    if (agencyError) return { ok: false, error: agencyError.message };
  }

  return { ok: true };
}

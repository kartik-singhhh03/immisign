import type { SupabaseClient } from '@supabase/supabase-js';

export const SERVICE_AGREEMENT_TEMPLATE_NAME = 'OMARA Service Agreement';

/**
 * Returns the single canonical service agreement template id for an agency.
 * Creates it when missing (e.g. legacy agencies without provision seed).
 */
export async function resolveServiceAgreementTemplateId(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('templates')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('is_service_agreement', true)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: legacy } = await supabase
    .from('templates')
    .select('id')
    .eq('agency_id', agencyId)
    .ilike('name', SERVICE_AGREEMENT_TEMPLATE_NAME)
    .limit(1)
    .maybeSingle();

  if (legacy?.id) {
    await supabase
      .from('templates')
      .update({ is_service_agreement: true, name: SERVICE_AGREEMENT_TEMPLATE_NAME })
      .eq('id', legacy.id)
      .eq('agency_id', agencyId);
    return legacy.id;
  }

  const { data: created, error } = await supabase
    .from('templates')
    .insert({
      agency_id: agencyId,
      name: SERVICE_AGREEMENT_TEMPLATE_NAME,
      content: { html: '' },
      is_service_agreement: true,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('SERVICE_AGREEMENT_TEMPLATE_CREATE_FAILED', error.message);
    return null;
  }

  return created?.id ?? null;
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { AVC_MATTER_TYPES, AVC_STANDARD_CLAUSES } from '@/features/agreements/constants/avc-standard'

/** Ensure AVC baseline matter types and clauses exist for an agency (idempotent). */
export async function ensureAvcAgreementDefaults(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<void> {
  const { data: existingTypes } = await supabase
    .from('matter_types')
    .select('name')
    .eq('agency_id', agencyId)

  const typeNames = new Set((existingTypes || []).map((t) => t.name))
  const typesToInsert = AVC_MATTER_TYPES.filter((t) => !typeNames.has(t.name)).map((t) => ({
    agency_id: agencyId,
    name: t.name,
    sort_order: t.sortOrder,
    subclass_placeholder: t.subclassPlaceholder,
    is_active: true,
  }))

  if (typesToInsert.length) {
    await supabase.from('matter_types').insert(typesToInsert)
  }

  // Archive legacy visa-stream types if still active
  await supabase
    .from('matter_types')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .in('name', [
      'Partner Visa (Onshore/Offshore)',
      'Skilled Migration',
      'Employer Sponsored',
      'Parent Visa',
      'Student Visa',
      'Visitor Visa',
      'Bridging Visa',
      'Aged Dependent Relative',
      'ART Appeal / Merits Review',
      'Character / Health Waiver',
    ])
    .is('archived_at', null)

  const { count } = await supabase
    .from('agreement_clauses')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)

  if (!count) {
    await supabase.from('agreement_clauses').insert(
      AVC_STANDARD_CLAUSES.map((c) => ({
        agency_id: agencyId,
        clause_key: c.key,
        title: c.title,
        content: c.content,
        order_index: c.order,
        is_mandatory: c.mandatory,
        is_enabled_by_default: true,
      })),
    )
  }
}

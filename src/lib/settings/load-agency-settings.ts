import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AgencySettings,
  MatterTypeConfig,
} from './types'

export async function loadAgencySettings(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AgencySettings> {
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug, name, legal_name, principal_name, marn, email, phone, website, address, abn, timezone')
    .eq('id', agencyId)
    .single()

  const { data: branding } = await supabase
    .from('branding_settings')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle()

  const { data: defaults } = await supabase
    .from('matter_defaults')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle()

  const { data: matterTypeRowsRaw } = await supabase
    .from('matter_types')
    .select('id, name, sort_order, subclass_placeholder, show_secondary_applicant, show_sponsor, show_dependants, is_active, archived_at')
    .eq('agency_id', agencyId)
    .order('sort_order', { ascending: true })

  const matterTypeRows = (matterTypeRowsRaw || []).filter(
    (m) => !m.archived_at && m.is_active !== false,
  )

  const matterTypeIds = (matterTypeRows || []).map((m) => m.id)
  let fieldRows: any[] = []
  if (matterTypeIds.length) {
    const { data: fields } = await supabase
      .from('matter_type_fields')
      .select('*')
      .in('matter_type_id', matterTypeIds)
      .order('sort_order', { ascending: true })
    fieldRows = fields || []
  }

  const { data: paymentSchedules } = await supabase
    .from('agency_payment_schedules')
    .select('label, sort_order')
    .eq('agency_id', agencyId)
    .order('sort_order', { ascending: true })

  const { data: clauses } = await supabase
    .from('agreement_clauses')
    .select('id, title, content, clause_key, is_mandatory, is_enabled_by_default, order_index')
    .eq('agency_id', agencyId)
    .order('order_index', { ascending: true })

  const { data: rmas } = await supabase
    .from('rmas')
    .select('id, user_id, mara_number, phone, is_default, rma_status, rma_tier, users(full_name, email, phone)')
    .eq('agency_id', agencyId)
    .order('is_default', { ascending: false })

  const matterTypes: MatterTypeConfig[] = (matterTypeRows || []).map((m) => ({
    id: m.id,
    name: m.name,
    subclassPlaceholder: m.subclass_placeholder || undefined,
    showSecondaryApplicant: Boolean(m.show_secondary_applicant),
    showSponsor: Boolean(m.show_sponsor),
    showDependants: Boolean(m.show_dependants),
    isActive: m.is_active !== false,
    archivedAt: m.archived_at || null,
    sortOrder: m.sort_order ?? 0,
    fields: fieldRows
      .filter((f) => f.matter_type_id === m.id)
      .map((f) => ({
        key: f.field_key,
        label: f.label,
        fieldType: (f.field_type || 'text') as MatterTypeConfig['fields'][0]['fieldType'],
        required: Boolean(f.required),
        sortOrder: f.sort_order ?? 0,
        placeholder: f.placeholder || undefined,
        colSpan: (f.col_span === 2 ? 2 : 1) as 1 | 2,
      })),
  }))

  const paymentScheduleLabels = paymentSchedules?.map((p) => p.label).filter(Boolean) || []

  const defaultPayment =
    defaults?.default_payment_schedule ||
    paymentScheduleLabels[0] ||
    ''

  return {
    agency: {
      id: agencyId,
      name: agency?.name || '',
      slug: agency?.slug || '',
      legalName: agency?.legal_name || agency?.name,
      principalName: agency?.principal_name || undefined,
      marn: agency?.marn || undefined,
      email: agency?.email || undefined,
      phone: agency?.phone || undefined,
      website: agency?.website || undefined,
      address: agency?.address || undefined,
      abn: agency?.abn || undefined,
      timezone: agency?.timezone || undefined,
    },
    branding: {
      logoUrl: branding?.logo_url || undefined,
      primaryColor: branding?.primary_color || '#111111',
      secondaryColor: branding?.secondary_color || '#111111',
      fontFamily: branding?.font_family || 'Inter',
      emailFooter: branding?.email_footer || undefined,
      agreementRefPrefix: branding?.agreement_ref_prefix || 'AGR',
      agreementRefStart: Number(branding?.agreement_ref_start) || 1000,
      agreementHeaderTitle: branding?.agreement_header_title || 'Migration Agent Service Agreement',
      agreementFooterText:
        branding?.agreement_footer_text ||
        'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.',
    },
    matterTypes,
    paymentSchedules: paymentScheduleLabels,
    defaults: {
      scopeOfServices: defaults?.default_scope_of_services || '',
      specialTerms: defaults?.default_special_terms || '',
      professionalFee: defaults?.default_professional_fee
        ? String(defaults.default_professional_fee)
        : '',
      paymentSchedule: defaultPayment,
    },
    clauses: (clauses || []).map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      clauseKey: c.clause_key || undefined,
      isMandatory: Boolean(c.is_mandatory),
      enabledByDefault: c.is_enabled_by_default !== false,
      orderIndex: c.order_index ?? 0,
    })),
    rmaTeam: (rmas || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      name: r.users?.full_name || '',
      email: r.users?.email || '',
      phone: r.phone || r.users?.phone || undefined,
      marn: r.mara_number,
      isDefault: Boolean(r.is_default),
      status: r.rma_status || 'active',
      tier: r.rma_tier || 'associate',
      signatureMode: r.signature_mode || null,
      signatureUrl: r.signature_url || null,
      signatureText: r.signature_text || null,
    })),
  }
}

export function defaultSelectedClauseIds(settings: AgencySettings): string[] {
  return settings.clauses.filter((c) => c.enabledByDefault).map((c) => c.id)
}

export function resolveSelectedClauses(
  settings: AgencySettings,
  selectedIds: string[]
) {
  const byId = new Map(settings.clauses.map((c) => [c.id, c]))
  return selectedIds.map((id) => byId.get(id)).filter(Boolean) as AgencySettings['clauses']
}

export function agencySettingsNeedsSetup(settings: AgencySettings): boolean {
  return (
    settings.matterTypes.length === 0 ||
    settings.paymentSchedules.length === 0 ||
    settings.clauses.length === 0
  )
}

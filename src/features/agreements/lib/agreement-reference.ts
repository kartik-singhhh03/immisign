import { createAdminClient } from '@/lib/supabase/admin';

export type AgreementNumberingConfig = {
  prefix: string;
  startNumber: number;
};

function formatRef(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export async function loadAgreementNumbering(agencyId: string): Promise<AgreementNumberingConfig> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('branding_settings')
    .select('agreement_ref_prefix, agreement_ref_start')
    .eq('agency_id', agencyId)
    .maybeSingle();

  const prefix = (data?.agreement_ref_prefix || 'AGR').toUpperCase().slice(0, 12);
  const startNumber = Number(data?.agreement_ref_start) || 1000;
  return { prefix, startNumber };
}

async function allocateViaCounterTable(
  agencyId: string,
  prefix: string,
  startNumber: number
): Promise<string> {
  const admin = createAdminClient();
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 12; attempt++) {
    const { data: row } = await admin
      .from('agreement_reference_counters')
      .select('last_value')
      .eq('agency_id', agencyId)
      .eq('ref_year', year)
      .maybeSingle();

    if (row) {
      const next = Number(row.last_value) + 1;
      const { data: updated } = await admin
        .from('agreement_reference_counters')
        .update({ last_value: next })
        .eq('agency_id', agencyId)
        .eq('ref_year', year)
        .eq('last_value', row.last_value)
        .select('last_value')
        .maybeSingle();
      if (updated) return formatRef(prefix, year, next);
      continue;
    }

    const initial = Math.max(startNumber, 1) - 1;
    const { error: insertErr } = await admin
      .from('agreement_reference_counters')
      .insert({ agency_id: agencyId, ref_year: year, last_value: initial + 1 });
    if (!insertErr) return formatRef(prefix, year, initial + 1);
    if (!String(insertErr.message).includes('duplicate')) throw insertErr;
  }

  throw new Error('Failed to allocate agreement reference after retries');
}

export async function allocateAgreementReference(agencyId: string): Promise<string> {
  const { prefix, startNumber } = await loadAgreementNumbering(agencyId);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('allocate_agreement_reference', {
    p_agency_id: agencyId,
    p_prefix: prefix,
  });

  if (!error && data) return String(data);
  return allocateViaCounterTable(agencyId, prefix, startNumber);
}

export function buildAgreementRefPrefix(agencySlug: string): string {
  return agencySlug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'AGR';
}

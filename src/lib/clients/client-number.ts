import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAgreementNumbering } from '@/features/agreements/lib/agreement-reference';

function formatClientNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export async function allocateClientNumber(
  agencyId: string,
  supabase?: SupabaseClient,
): Promise<string> {
  const db = supabase ?? createAdminClient();
  const { prefix, startNumber } = await loadAgreementNumbering(agencyId, supabase);
  const year = new Date().getFullYear();

  const { count } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .not('client_number', 'is', null);

  const base = Math.max(startNumber, 1);
  const seq = base + (count || 0);
  let candidate = formatClientNumber(prefix, year, seq);

  for (let i = 0; i < 20; i++) {
    const { data: clash } = await db
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_number', candidate)
      .maybeSingle();
    if (!clash) return candidate;
    candidate = formatClientNumber(prefix, year, seq + i + 1);
  }

  return formatClientNumber(prefix, year, Date.now() % 10000);
}

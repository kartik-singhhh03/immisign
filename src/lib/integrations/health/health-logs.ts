import type { SupabaseClient } from '@supabase/supabase-js';
import type { HealthStatus } from './types';

export async function logHealthCheck(
  supabase: SupabaseClient,
  integration: string,
  status: HealthStatus,
  message: string,
  agencyId?: string | null,
) {
  try {
    await supabase.from('integration_health_logs').insert({
      integration,
      status,
      message,
      agency_id: agencyId ?? null,
    });
  } catch {
    // Table may not exist until migration applied
  }
}

export async function getLastHealthPings(
  supabase: SupabaseClient,
  integration: string,
): Promise<{ lastSuccessAt: string | null; lastFailureAt: string | null }> {
  try {
    const { data: success } = await supabase
      .from('integration_health_logs')
      .select('checked_at')
      .eq('integration', integration)
      .eq('status', 'healthy')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: failure } = await supabase
      .from('integration_health_logs')
      .select('checked_at')
      .eq('integration', integration)
      .in('status', ['warning', 'error'])
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      lastSuccessAt: success?.checked_at ?? null,
      lastFailureAt: failure?.checked_at ?? null,
    };
  } catch {
    return { lastSuccessAt: null, lastFailureAt: null };
  }
}

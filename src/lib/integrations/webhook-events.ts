import type { SupabaseClient } from '@supabase/supabase-js';

export type WebhookEventStatus = 'received' | 'processed' | 'failed';

export async function recordWebhookEvent(
  supabase: SupabaseClient,
  input: {
    provider: string;
    eventType: string;
    externalId?: string | null;
    payload?: Record<string, unknown> | null;
    payloadHash?: string | null;
    status?: WebhookEventStatus;
    error?: string | null;
    agencyId?: string | null;
    processedAt?: string | null;
  },
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        provider: input.provider,
        event_type: input.eventType,
        external_id: input.externalId ?? null,
        payload: input.payload ?? null,
        payload_hash: input.payloadHash ?? null,
        status: input.status ?? 'received',
        error: input.error ?? null,
        agency_id: input.agencyId ?? null,
        processed_at: input.processedAt ?? (input.status === 'processed' ? new Date().toISOString() : null),
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[webhook-events] insert failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn('[webhook-events] insert exception:', e);
    return null;
  }
}

export async function markWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
  status: 'processed' | 'failed',
  error?: string,
) {
  try {
    await supabase
      .from('webhook_events')
      .update({
        status,
        error: error ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId);
  } catch (e) {
    console.warn('[webhook-events] update failed:', e);
  }
}

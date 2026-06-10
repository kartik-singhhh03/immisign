import type { SupabaseClient } from '@supabase/supabase-js';

export type DocumentAuditType =
  | 'service_agreement'
  | 'application_approval'
  | 'statement_of_service'
  | 'certificate';

export type DocumentAuditEventType =
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'acknowledged'
  | 'completed'
  | 'generated';

export type DocumentAuditPayload = {
  agencyId: string;
  clientId?: string | null;
  matterId?: string | null;
  documentType: DocumentAuditType;
  documentId: string;
  eventType: DocumentAuditEventType;
  eventTimestamp?: string;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  provider?: string | null;
  metadata?: Record<string, unknown>;
};

export class DocumentAuditService {
  constructor(private supabase: SupabaseClient) {}

  async record(payload: DocumentAuditPayload): Promise<void> {
    const { error } = await this.supabase.from('document_audit_events').insert({
      agency_id: payload.agencyId,
      client_id: payload.clientId ?? null,
      matter_id: payload.matterId ?? null,
      document_type: payload.documentType,
      document_id: payload.documentId,
      event_type: payload.eventType,
      event_timestamp: payload.eventTimestamp ?? new Date().toISOString(),
      actor_name: payload.actorName ?? null,
      actor_email: payload.actorEmail ?? null,
      ip_address: payload.ipAddress ?? null,
      provider: payload.provider ?? null,
      metadata: payload.metadata ?? {},
    });
    if (error) {
      console.error('DOCUMENT_AUDIT_INSERT_FAILED', error.message);
    }
  }

  async listForClient(agencyId: string, clientId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('document_audit_events')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .order('event_timestamp', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }
}

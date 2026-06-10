import type { SupabaseClient } from '@supabase/supabase-js';

export type ComplianceEventType =
  | 'sos_created'
  | 'sos_sent'
  | 'sos_acknowledged'
  | 'note_added'
  | 'notes_exported'
  | 'agreement_created'
  | 'agreement_sent'
  | 'agreement_signed'
  | 'approval_created'
  | 'approval_sent'
  | 'approval_signed'
  | 'lodgement_recorded'
  | 'matter_completed';

export type RecordComplianceEventInput = {
  agencyId: string;
  eventType: ComplianceEventType;
  clientId?: string | null;
  matterId?: string | null;
  fileSource?: 'agreement' | 'application_approval' | null;
  fileId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export class ComplianceEventsService {
  constructor(private supabase: SupabaseClient) {}

  async record(input: RecordComplianceEventInput): Promise<void> {
    const { error } = await this.supabase.from('compliance_events').insert({
      agency_id: input.agencyId,
      client_id: input.clientId ?? null,
      matter_id: input.matterId ?? null,
      file_source: input.fileSource ?? null,
      file_id: input.fileId ?? null,
      event_type: input.eventType,
      actor_user_id: input.actorUserId ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) throw new Error(`compliance_events insert failed: ${error.message}`);
  }
}

export async function recordComplianceEvent(
  supabase: SupabaseClient,
  input: RecordComplianceEventInput,
): Promise<void> {
  await new ComplianceEventsService(supabase).record(input);
}

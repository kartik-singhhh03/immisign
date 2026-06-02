import { SupabaseClient } from '@supabase/supabase-js';
import { AuditEvent, AuditEventSchema } from '../types';
import { assertUuid } from '@/lib/validation/uuid';

export class AuditRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(event: Partial<AuditEvent>): Promise<AuditEvent> {
    assertUuid(event.agency_id, 'agency_id');
    assertUuid(event.user_id, 'user_id');
    assertUuid(event.entity_id, 'entity_id');

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert({
        ...event,
        entity_type: event.entity_type || 'agreement', // Allow custom, default to agreement
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating audit event: ${error.message}`);
    return AuditEventSchema.parse(data);
  }

  async listForAgreement(agreementId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'agreement')
      .eq('entity_id', agreementId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error fetching audit events: ${error.message}`);
    return data.map(d => AuditEventSchema.parse(d));
  }
}

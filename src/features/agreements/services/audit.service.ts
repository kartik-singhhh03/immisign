import { SupabaseClient } from '@supabase/supabase-js';
import { AuditRepository } from '../repositories/audit.repository';

export class AuditService {
  private auditRepo: AuditRepository;
  
  constructor(private readonly supabase: SupabaseClient) {
    this.auditRepo = new AuditRepository(supabase);
  }

  async logEvent(
    agencyId: string, 
    userId: string, 
    agreementId: string, 
    action: string, 
    metadata?: any
  ) {
    return this.auditRepo.create({
      agency_id: agencyId,
      user_id: userId,
      entity_id: agreementId,
      action,
      metadata,
    });
  }
}

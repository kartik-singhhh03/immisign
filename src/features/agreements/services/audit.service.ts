import { SupabaseClient } from '@supabase/supabase-js';
import { AuditRepository } from '../repositories/audit.repository';
import { assertUuid } from '@/lib/validation/uuid';

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
    try {
      assertUuid(agencyId, 'agency_id');
      assertUuid(userId, 'user_id');
      assertUuid(agreementId, 'agreement_id');

      return await this.auditRepo.create({
        agency_id: agencyId,
        user_id: userId,
        entity_id: agreementId,
        action,
        metadata,
      });
    } catch (error: any) {
      console.warn('Agreement audit log warning:', error?.message || error);
      return null;
    }
  }
}

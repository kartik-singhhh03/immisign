import { SupabaseClient } from '@supabase/supabase-js';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AuditService } from './audit.service';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus, Agreement } from '../types';
import { Role, canCreate, canEdit, canDelete } from '@/features/auth/types/roles';

export class AgreementService {
  private agreementRepo: AgreementRepository;
  private auditService: AuditService;

  constructor(private readonly supabase: SupabaseClient) {
    this.agreementRepo = new AgreementRepository(supabase);
    this.auditService = new AuditService(supabase);
  }

  async createAgreement(agencyId: string, userId: string, role: Role, data: Partial<Agreement>) {
    if (!canCreate(role, 'agreements')) throw new Error("RBAC: Unauthorized to create agreements");
    
    data.status = AgreementStatus.DRAFT;
    const agreement = await this.agreementRepo.create({ ...data, agency_id: agencyId, created_by: userId });
    
    await this.auditService.logEvent(agencyId, userId, agreement.id, 'Agreement Created');
    return agreement;
  }

  async updateAgreement(agencyId: string, userId: string, role: Role, agreementId: string, data: Partial<Agreement>) {
    if (!canEdit(role, 'agreements')) throw new Error("RBAC: Unauthorized to edit agreements");
    
    const existing = await this.agreementRepo.getById(agreementId);
    if (!existing) throw new Error("Agreement not found");
    
    if (data.status && data.status !== existing.status) {
      AgreementStateMachine.validateTransition(existing.status, data.status);
      if (data.status === AgreementStatus.GENERATED) {
        await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Generated');
      } else if (data.status === AgreementStatus.SENT) {
        await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Sent');
      } else if (data.status === AgreementStatus.VIEWED) {
        await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Viewed');
      } else if (data.status === AgreementStatus.SIGNED) {
        await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Signed');
      } else if (data.status === AgreementStatus.CANCELLED) {
        await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Cancelled');
      }
    }
    
    const updated = await this.agreementRepo.update(agreementId, data);
    await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Updated', { changes: data });
    return updated;
  }

  async archiveAgreement(agencyId: string, userId: string, role: Role, agreementId: string) {
    if (!canDelete(role, 'agreements')) throw new Error("RBAC: Unauthorized to archive agreements");
    
    const archived = await this.agreementRepo.update(agreementId, { deleted_at: new Date().toISOString() });
    await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Archived');
    return archived;
  }

  async listAgreements(agencyId: string, role: Role) {
    // In a full implementation, we'd check canView
    return this.agreementRepo.list(); // Repository doesn't take agencyId in our mock, but we can filter by it
  }

  async getAgreement(agencyId: string, role: Role, agreementId: string) {
    const agreement = await this.agreementRepo.getById(agreementId);
    if (!agreement || agreement.agency_id !== agencyId) throw new Error("Agreement not found");
    return agreement;
  }
}

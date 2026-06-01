import { SupabaseClient } from '@supabase/supabase-js';
import { ApprovalRepository } from '../repositories/approvals.repository';
import { AuditRepository } from '@/features/agreements/repositories/audit.repository';
import { ApprovalStateMachine } from './state-machine';
import { ApplicationApproval, ApprovalStatus } from '../types';
import { Role } from '@/features/auth/types/roles';

// Simple RBAC check (can extend later)
function canManageApprovals(role: any) {
  return role === 'owner' || role === 'admin' || role === 'migration_agent' || role === 'agent' || role === 'agency_admin';
}

export class ApprovalService {
  private repo: ApprovalRepository;
  private auditRepo: AuditRepository;

  constructor(private supabase: SupabaseClient) {
    this.repo = new ApprovalRepository(supabase);
    this.auditRepo = new AuditRepository(supabase);
  }

  async createApproval(agencyId: string, userId: string, role: Role, data: Partial<ApplicationApproval>) {
    if (!canManageApprovals(role)) throw new Error("Unauthorized to manage approvals");

    const approval = await this.repo.create({
      ...data,
      agency_id: agencyId,
      created_by: userId,
      status: ApprovalStatus.DRAFT,
      review_token: crypto.randomUUID(), // generate secure random token
    });

    await this.auditRepo.create({
      agency_id: agencyId,
      user_id: userId,
      entity_type: 'approval' as any,
      entity_id: approval.id,
      action: 'Approval Created',
    });

    return approval;
  }

  async sendForReview(agencyId: string, userId: string, role: Role, approvalId: string) {
    if (!canManageApprovals(role)) throw new Error("Unauthorized to manage approvals");

    const approval = await this.repo.getById(approvalId);
    if (!approval || approval.agency_id !== agencyId) throw new Error("Not found");
    if (!approval.document_path) throw new Error("Cannot send for review without a document");

    ApprovalStateMachine.validateTransition(approval.status, ApprovalStatus.PENDING_REVIEW);

    const updated = await this.repo.update(approvalId, { status: ApprovalStatus.PENDING_REVIEW });

    await this.auditRepo.create({
      agency_id: agencyId,
      user_id: userId,
      entity_type: 'approval' as any,
      entity_id: approvalId,
      action: 'Sent for Client Review',
    });

    // TODO: Notify client via Email Service using approval.review_token

    return updated;
  }

  // Client-facing method using secure token (bypasses agent RBAC, authenticates via token)
  async markViewedByClient(token: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error("Invalid token");

    if (ApprovalStateMachine.canTransition(approval.status, ApprovalStatus.VIEWED)) {
      await this.repo.update(approval.id, { status: ApprovalStatus.VIEWED });
      
      await this.auditRepo.create({
        agency_id: approval.agency_id,
        entity_type: 'approval' as any,
        entity_id: approval.id,
        action: 'Document Viewed by Client',
      });
    }
    return approval;
  }

  async approveByClient(token: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error("Invalid token");

    ApprovalStateMachine.validateTransition(approval.status, ApprovalStatus.APPROVED);

    const updated = await this.repo.update(approval.id, { 
      status: ApprovalStatus.APPROVED,
      approved_at: new Date().toISOString()
    });
    
    await this.auditRepo.create({
      agency_id: approval.agency_id,
      entity_type: 'approval' as any,
      entity_id: approval.id,
      action: 'Application Approved',
    });

    // TODO: Notify agent via Email Service

    return updated;
  }

  async requestChangesByClient(token: string, comment: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error("Invalid token");

    ApprovalStateMachine.validateTransition(approval.status, ApprovalStatus.CHANGES_REQUESTED);

    const updated = await this.repo.update(approval.id, { 
      status: ApprovalStatus.CHANGES_REQUESTED,
      revision_count: approval.revision_count + 1
    });

    // Save comment
    await this.supabase.from('approval_comments').insert({
      approval_id: approval.id,
      author_type: 'client',
      content: comment,
    });
    
    await this.auditRepo.create({
      agency_id: approval.agency_id,
      entity_type: 'approval' as any,
      entity_id: approval.id,
      action: 'Changes Requested',
      metadata: { comment_preview: comment.substring(0, 50) }
    });

    // TODO: Notify agent via Email Service

    return updated;
  }

  async uploadNewVersion(agencyId: string, userId: string, role: Role, approvalId: string, newPath: string) {
    if (!canManageApprovals(role)) throw new Error("Unauthorized");

    const approval = await this.repo.getById(approvalId);
    if (!approval || approval.agency_id !== agencyId) throw new Error("Not found");

    const updated = await this.repo.update(approvalId, { 
      document_path: newPath,
      version_number: approval.version_number + 1,
      status: ApprovalStatus.DRAFT // Resets to draft so agent can review before sending again
    });

    await this.auditRepo.create({
      agency_id: agencyId,
      user_id: userId,
      entity_type: 'approval' as any,
      entity_id: approvalId,
      action: 'New Document Version Uploaded',
      metadata: { version: updated.version_number }
    });

    return updated;
  }
}

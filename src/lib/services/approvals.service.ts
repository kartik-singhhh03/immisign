import { approvalRepository } from '../repositories/mock/approval.repository';
import { documentRepository } from '../repositories/mock/approval-document.repository';
import { auditRepository } from '../repositories/mock/approval-audit.repository';
import { ApplicationApproval, ApprovalStatus } from '@/types/approval';

export class ApprovalService {
  async getApproval(id: string) {
    return approvalRepository.getById(id);
  }

  async listAgencyApprovals(agencyId: string) {
    return approvalRepository.listByAgency(agencyId);
  }

  async createApproval(data: Partial<ApplicationApproval>, userId: string) {
    const approval = await approvalRepository.create({
      ...data,
      created_by: userId,
      status: 'draft'
    });

    await auditRepository.log({
      applicationId: approval.id,
      agencyId: approval.agency_id,
      userId: userId,
      action: 'APPROVAL_CREATED',
      metadata: { title: approval.title }
    });

    return approval;
  }

  async updateStatus(id: string, status: ApprovalStatus, userId: string, agencyId: string) {
    const prev = await approvalRepository.getById(id);
    if (!prev) throw new Error('Not found');

    const updated = await approvalRepository.updateStatus(id, status);

    await auditRepository.log({
      applicationId: id,
      agencyId: agencyId,
      userId: userId,
      action: 'STATUS_CHANGED',
      metadata: { from: prev.status, to: status }
    });

    return updated;
  }

  async toggleChecklist(approvalId: string, itemId: string, checked: boolean, userId: string, agencyId: string) {
    const approval = await approvalRepository.getById(approvalId);
    if (!approval) throw new Error('Not found');

    const updatedChecklist = approval.checklist.map(item => 
      item.id === itemId ? { ...item, checked, completedAt: checked ? new Date().toISOString() : undefined, completedBy: checked ? userId : undefined } : item
    );

    const updated = await approvalRepository.update(approvalId, { checklist: updatedChecklist });

    const itemLabel = approval.checklist.find(i => i.id === itemId)?.label;

    await auditRepository.log({
      applicationId: approvalId,
      agencyId: agencyId,
      userId: userId,
      action: checked ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_UNCHECKED',
      metadata: { itemId, label: itemLabel }
    });

    return updated;
  }
}

export const approvalService = new ApprovalService();
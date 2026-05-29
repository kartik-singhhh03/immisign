import { 
  ApplicationApproval, 
  ApprovalStatus, 
  ApprovalDocument, 
  ApprovalChecklist, 
  ApprovalAuditEvent, 
  ApprovalReminder 
} from "@/types/approval-domain"

export interface ApprovalRepository {
  findById(id: string, agencyId: string): Promise<ApplicationApproval | null>
  findByAgencyId(agencyId: string): Promise<ApplicationApproval[]>
  create(approval: ApplicationApproval): Promise<ApplicationApproval>
  updateStatus(id: string, agencyId: string, status: ApprovalStatus): Promise<ApplicationApproval>
  addDocument(approvalId: string, agencyId: string, document: ApprovalDocument): Promise<void>
  removeDocument(documentId: string, approvalId: string, agencyId: string): Promise<void>
  updateChecklistItem(approvalId: string, checklistId: string, agencyId: string, updates: Partial<ApprovalChecklist>): Promise<void>
  addAuditEvent(approvalId: string, agencyId: string, event: ApprovalAuditEvent): Promise<void>
  addReminder(approvalId: string, agencyId: string, reminder: ApprovalReminder): Promise<void>
}

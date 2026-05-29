import { ApplicationApproval, ApprovalStatus, ApprovalChecklist } from "@/types/approval-domain"
import { ApprovalRepository } from "@/repositories/interfaces/ApprovalRepository"

export class ApprovalService {
  constructor(private readonly repository: ApprovalRepository) {}

  async getApprovalsByAgency(agencyId: string): Promise<ApplicationApproval[]> {
    return this.repository.findByAgencyId(agencyId)
  }

  async getApprovalById(id: string, agencyId: string): Promise<ApplicationApproval | null> {
    return this.repository.findById(id, agencyId)
  }

  async createApproval(data: Omit<ApplicationApproval, "id" | "created_at" | "updated_at" | "status" | "documents" | "verificationChecklist" | "declarations" | "auditEvents" | "reminders" | "reviewers">): Promise<ApplicationApproval> {
    const newApproval: ApplicationApproval = {
      ...data,
      id: `APP-${Math.floor(5000 + Math.random() * 1000)}`,
      status: "draft",
      documents: [],
      verificationChecklist: [],
      declarations: [],
      auditEvents: [],
      reminders: [],
      reviewers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return this.repository.create(newApproval)
  }

  async updateStatus(id: string, agencyId: string, status: ApprovalStatus, actorId: string): Promise<ApplicationApproval> {
    const updated = await this.repository.updateStatus(id, agencyId, status)
    // In a full implementation, this would also trigger AuditService and WorkflowEngine transitions.
    return updated
  }

  async completeVerification(approvalId: string, checklistId: string, agencyId: string): Promise<void> {
    await this.repository.updateChecklistItem(approvalId, checklistId, agencyId, { 
      isCompleted: true, 
      completedAt: new Date().toISOString() 
    })
  }
}

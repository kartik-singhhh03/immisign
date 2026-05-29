import { ApplicationApproval, ApprovalStatus } from "@/types/approval-domain"
import { ApprovalService } from "./ApprovalService"
import { AuditService } from "../audit/AuditService"

export class WorkflowEngine {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService
  ) {}

  async requestClientReview(approval: ApplicationApproval, actorId: string, actorName: string): Promise<ApplicationApproval> {
    if (approval.status !== "draft" && approval.status !== "preparing") {
      throw new Error("Cannot send for review from current state.")
    }
    
    if (approval.documents.length === 0) {
      throw new Error("Cannot send for review without documents.")
    }

    const updated = await this.approvalService.updateStatus(approval.id, approval.agency_id, "sent_to_client", actorId)
    await this.auditService.logEvent(
      approval.id, 
      approval.agency_id, 
      "sent", 
      "Application sent to client for review.", 
      actorId, 
      actorName
    )
    
    return updated
  }

  async clientApprove(approval: ApplicationApproval, actorId: string, actorName: string): Promise<ApplicationApproval> {
    const uncompletedChecklist = approval.verificationChecklist.filter(c => c.isRequired && !c.isCompleted)
    
    if (uncompletedChecklist.length > 0) {
      throw new Error("Cannot approve. Pending required checklist items.")
    }

    const updated = await this.approvalService.updateStatus(approval.id, approval.agency_id, "approved", actorId)
    await this.auditService.logEvent(
      approval.id, 
      approval.agency_id, 
      "approved", 
      "Client formally approved the application for lodgement.", 
      actorId, 
      actorName
    )
    
    // In a real app, you might transition it to "ready_for_lodgement" next by the agent.
    return updated
  }
}

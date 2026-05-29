import { ApprovalAuditEvent } from "@/types/approval-domain"
import { ApprovalRepository } from "@/repositories/interfaces/ApprovalRepository"

export class AuditService {
  constructor(private readonly repository: ApprovalRepository) {}

  async logEvent(
    approvalId: string, 
    agencyId: string, 
    type: ApprovalAuditEvent["type"], 
    description: string, 
    actorId: string, 
    actorName: string,
    ipAddress?: string
  ): Promise<ApprovalAuditEvent> {
    const event: ApprovalAuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      agency_id: agencyId,
      approval_id: approvalId,
      type,
      description,
      actor_id: actorId,
      actor_name: actorName,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    }
    
    await this.repository.addAuditEvent(approvalId, agencyId, event)
    return event
  }

  async getTimeline(approvalId: string, agencyId: string): Promise<ApprovalAuditEvent[]> {
    const approval = await this.repository.findById(approvalId, agencyId)
    return approval?.auditEvents || []
  }
}

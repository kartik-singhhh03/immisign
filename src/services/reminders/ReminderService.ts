import { ApprovalReminder } from "@/types/approval-domain"
import { ApprovalRepository } from "@/repositories/interfaces/ApprovalRepository"
import { AuditService } from "@/services/audit/AuditService"

export class ReminderService {
  constructor(
    private readonly repository: ApprovalRepository,
    private readonly auditService: AuditService
  ) {}

  async scheduleReminder(approvalId: string, agencyId: string, type: "email" | "sms", scheduledFor: string, actorId: string, actorName: string): Promise<ApprovalReminder> {
    const reminder: ApprovalReminder = {
      id: `rem-${Date.now()}`,
      agency_id: agencyId,
      approval_id: approvalId,
      type,
      status: "scheduled",
      scheduled_for: scheduledFor,
      created_at: new Date().toISOString()
    }
    
    await this.repository.addReminder(approvalId, agencyId, reminder)
    
    await this.auditService.logEvent(
      approvalId, 
      agencyId, 
      "reminder_sent", // Assuming we log intent for now
      `Scheduled ${type} reminder for ${new Date(scheduledFor).toLocaleDateString()}`,
      actorId,
      actorName
    )
    
    return reminder
  }
}

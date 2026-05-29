import { ApplicationApproval } from "@/types/approval-domain"

export class NotificationService {
  async sendReviewRequest(approval: ApplicationApproval): Promise<void> {
    console.log(`[NotificationService] Sending review request to ${approval.clientEmail}`)
    console.log(`[NotificationService] Subject: Action Required: Review ${approval.visaSubclass} Application`)
    console.log(`[NotificationService] Body: Dear ${approval.clientName}, please review your application prepared by ${approval.agentName}. Link: /review/${approval.id}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  async sendApprovalConfirmation(approval: ApplicationApproval): Promise<void> {
    console.log(`[NotificationService] Sending confirmation to ${approval.agentName}`)
    console.log(`[NotificationService] Subject: Client Approved: ${approval.clientName} - ${approval.visaSubclass}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

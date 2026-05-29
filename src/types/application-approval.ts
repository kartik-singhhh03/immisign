export type ApprovalStatus = 
  | "draft" 
  | "uploaded" 
  | "under_review" 
  | "sent_to_client" 
  | "viewed" 
  | "partially_reviewed" 
  | "approved" 
  | "rejected" 
  | "changes_requested" 
  | "ready_for_lodgement" 
  | "lodged" 
  | "archived"

export interface ApplicationDocument {
  id: string
  name: string
  url: string
  size: number
  type: string
  status: "pending" | "scanned" | "uploaded" | "error"
}

export interface VerificationItem {
  id: string
  label: string
  type: "confirmation" | "declaration" | "data_check"
  isRequired: boolean
  isCompleted: boolean
  completedAt?: string
}

export interface ApplicationApproval {
  id: string
  title: string
  visaSubclass: string
  clientName: string
  clientEmail: string
  agentName: string
  status: ApprovalStatus
  createdAt: string
  lodgementDeadline?: string
  documents: ApplicationDocument[]
  verificationChecklist: VerificationItem[]
  notes: string
  auditEvents: AuditEvent[]
}

export interface AuditEvent {
  id: string
  type: "created" | "document_uploaded" | "sent" | "viewed" | "verification_completed" | "approved"
  description: string
  timestamp: string
  actor: string
  ipAddress?: string
}

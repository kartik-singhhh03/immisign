export type ApprovalStatus = 
  | "draft" 
  | "preparing" 
  | "internal_review" 
  | "under_review"
  | "sent_to_client" 
  | "viewed" 
  | "partially_reviewed" 
  | "approved" 
  | "changes_requested" 
  | "ready_for_lodgement" 
  | "lodged" 
  | "archived"

export interface ApprovalDocument {
  id: string
  agency_id: string
  approval_id: string
  name: string
  url: string
  size: number
  type: string
  status: "pending" | "scanned" | "uploaded" | "error"
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApprovalChecklist {
  id: string
  agency_id: string
  approval_id: string
  label: string
  type: "confirmation" | "declaration" | "data_check"
  isRequired: boolean
  isCompleted: boolean
  completedAt?: string
  created_at: string
  updated_at: string
}

export interface ApprovalDeclaration {
  id: string
  agency_id: string
  approval_id: string
  content: string
  accepted: boolean
  acceptedAt?: string
}

export interface ApprovalAuditEvent {
  id: string
  agency_id: string
  approval_id: string
  type: "created" | "status_changed" | "document_uploaded" | "sent" | "viewed" | "verification_completed" | "approved" | "reminder_sent"
  description: string
  actor_id: string
  actor_name: string
  ip_address?: string
  created_at: string
}

export interface ApprovalReminder {
  id: string
  agency_id: string
  approval_id: string
  type: "email" | "sms"
  status: "scheduled" | "sent" | "failed"
  scheduled_for: string
  sent_at?: string
  created_at: string
}

export interface ApprovalReviewer {
  id: string
  agency_id: string
  approval_id: string
  name: string
  email: string
  has_viewed: boolean
  last_viewed_at?: string
  ip_address?: string
}

export interface ApprovalTemplate {
  id: string
  agency_id: string
  name: string
  description: string
  visaSubclass: string
  defaultChecklist: Omit<ApprovalChecklist, "id" | "approval_id" | "agency_id" | "created_at" | "updated_at">[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApplicationApproval {
  id: string
  agency_id: string
  title: string
  visaSubclass: string
  clientName: string
  clientEmail: string
  agentName: string
  agent_id: string
  status: ApprovalStatus
  lodgementDeadline?: string
  notes: string
  
  // Relations
  documents: ApprovalDocument[]
  verificationChecklist: ApprovalChecklist[]
  declarations: ApprovalDeclaration[]
  auditEvents: ApprovalAuditEvent[]
  reminders: ApprovalReminder[]
  reviewers: ApprovalReviewer[]
  
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApprovalActivity {
  id: string
  agency_id: string
  approval_id: string
  title: string
  description: string
  actor_id: string
  actor_name: string
  created_at: string
}

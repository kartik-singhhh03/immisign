/** @deprecated Use src/features/approvals/types/index.ts instead */
export type ApprovalStatus = 
  | 'draft'
  | 'preparing'
  | 'internal_review'
  | 'sent_to_client'
  | 'viewed'
  | 'partially_reviewed'
  | 'approved'
  | 'ready_for_lodgement'
  | 'lodged'
  | 'archived';

export interface ApprovalChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface ApprovalDeclaration {
  id: string;
  label: string;
  agreed: boolean;
  required: boolean;
  agreedAt?: string;
  agreedBy?: string;
}

export interface ApprovalDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'scanned';
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  applicationId: string;
  agencyId: string;
}

export interface ApprovalAuditEvent {
  id: string;
  applicationId: string;
  agencyId: string;
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ApplicationApproval {
  id: string;
  agency_id: string;
  client_id: string;
  title: string;
  description?: string;
  status: ApprovalStatus;
  
  checklist: ApprovalChecklistItem[];
  declarations: ApprovalDeclaration[];
  
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  approved_at?: string;
  lodged_at?: string;
}

// Repositories interfaces
export interface IApprovalRepository {
  getById(id: string): Promise<ApplicationApproval | null>;
  listByAgency(agencyId: string): Promise<ApplicationApproval[]>;
  create(approval: Partial<ApplicationApproval>): Promise<ApplicationApproval>;
  update(id: string, updates: Partial<ApplicationApproval>): Promise<ApplicationApproval>;
  delete(id: string): Promise<void>;
  
  // Transitions
  updateStatus(id: string, status: ApprovalStatus): Promise<ApplicationApproval>;
}

export interface IApprovalDocumentRepository {
  listByApplication(applicationId: string): Promise<ApprovalDocument[]>;
  create(document: Partial<ApprovalDocument>): Promise<ApprovalDocument>;
  update(id: string, updates: Partial<ApprovalDocument>): Promise<ApprovalDocument>;
  delete(id: string): Promise<void>;
}

export interface IApprovalAuditRepository {
  listByApplication(applicationId: string): Promise<ApprovalAuditEvent[]>;
  log(event: Omit<ApprovalAuditEvent, 'id' | 'createdAt'>): Promise<ApprovalAuditEvent>;
}


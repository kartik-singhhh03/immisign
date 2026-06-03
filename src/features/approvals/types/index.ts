import { z } from 'zod';

export enum ApprovalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  READY_TO_LODGE = 'ready_to_lodge',
  LODGED = 'lodged',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

export type ApprovalAction =
  | 'submit'
  | 'start_review'
  | 'request_changes'
  | 'approve'
  | 'reject'
  | 'resubmit'
  | 'ready_to_lodge'
  | 'lodged'
  | 'close'
  | 'assign_reviewer'
  | 'assign_rma';

export const ApprovalStatusEnum = z.nativeEnum(ApprovalStatus);

export const ApplicationApprovalSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  client_id: z.string().uuid().optional().nullable(),
  created_by: z.string().uuid(),
  approval_number: z.string().optional().nullable(),
  title: z.string(),
  visa_subclass: z.string().optional().nullable(),
  matter_type_id: z.string().uuid().optional().nullable(),
  matter_reference: z.string().optional().nullable(),
  status: ApprovalStatusEnum,
  review_token: z.string().optional().nullable(),
  document_path: z.string().optional().nullable(),
  version_number: z.number().default(1),
  revision_count: z.number().default(0),
  assigned_reviewer_id: z.string().uuid().optional().nullable(),
  assigned_rma_id: z.string().uuid().optional().nullable(),
  priority: z.string().default('normal'),
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  lodgement_deadline: z.string().optional().nullable(),
  approved_at: z.string().optional().nullable(),
  submitted_at: z.string().optional().nullable(),
  ready_to_lodge_at: z.string().optional().nullable(),
  lodged_at: z.string().optional().nullable(),
  closed_at: z.string().optional().nullable(),
  rejected_at: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().optional().nullable(),
});

export type ApplicationApproval = z.infer<typeof ApplicationApprovalSchema>;

export const ApprovalCommentSchema = z.object({
  id: z.string().uuid(),
  approval_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().nullable(),
  author_type: z.enum(['agent', 'client']),
  author_id: z.string().uuid().optional().nullable(),
  author_role: z.string().optional().nullable(),
  visibility: z.enum(['internal', 'client_visible']).default('internal'),
  content: z.string(),
  mentions: z.array(z.string()).optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
});

export type ApprovalComment = z.infer<typeof ApprovalCommentSchema>;

export const ApprovalAttachmentSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  approval_id: z.string().uuid(),
  uploaded_by: z.string().uuid(),
  file_name: z.string(),
  storage_path: z.string(),
  mime_type: z.string().optional().nullable(),
  file_size: z.number().optional().nullable(),
  version_number: z.number(),
  is_current: z.boolean(),
  created_at: z.string(),
});

export type ApprovalAttachment = z.infer<typeof ApprovalAttachmentSchema>;

export const ApprovalChecklistItemSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  approval_id: z.string().uuid(),
  item_key: z.string(),
  label: z.string(),
  sort_order: z.number(),
  is_completed: z.boolean(),
  completed_at: z.string().optional().nullable(),
  completed_by: z.string().uuid().optional().nullable(),
  created_at: z.string(),
});

export type ApprovalChecklistItem = z.infer<typeof ApprovalChecklistItemSchema>;

export type ApprovalListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApprovalStatus | ApprovalStatus[];
  agentId?: string;
  reviewerId?: string;
  matterTypeId?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const DEFAULT_CHECKLIST_ITEMS: { item_key: string; label: string; sort_order: number }[] = [
  { item_key: 'passport_received', label: 'Passport received', sort_order: 1 },
  { item_key: 'form_completed', label: 'Form completed', sort_order: 2 },
  { item_key: 'ielts_received', label: 'IELTS received', sort_order: 3 },
  { item_key: 'skills_assessment_received', label: 'Skills assessment received', sort_order: 4 },
  { item_key: 'employment_evidence_received', label: 'Employment evidence received', sort_order: 5 },
  { item_key: 'health_completed', label: 'Health completed', sort_order: 6 },
  { item_key: 'character_completed', label: 'Character completed', sort_order: 7 },
  { item_key: 'lodgement_fee_collected', label: 'Lodgement fee collected', sort_order: 8 },
];

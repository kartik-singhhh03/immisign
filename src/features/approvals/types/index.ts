import { z } from 'zod';

export enum ApprovalStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  VIEWED = 'viewed',
  APPROVED = 'approved',
  CHANGES_REQUESTED = 'changes_requested',
  ARCHIVED = 'archived',
}

export const ApprovalStatusEnum = z.nativeEnum(ApprovalStatus);

export const ApplicationApprovalSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  client_id: z.string().uuid().optional().nullable(),
  created_by: z.string().uuid(),
  title: z.string(),
  visa_subclass: z.string().optional().nullable(),
  status: ApprovalStatusEnum,
  review_token: z.string().optional().nullable(),
  document_path: z.string().optional().nullable(),
  version_number: z.number().default(1),
  revision_count: z.number().default(0),
  lodgement_deadline: z.string().optional().nullable(),
  approved_at: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().optional().nullable(),
});

export type ApplicationApproval = z.infer<typeof ApplicationApprovalSchema>;

export const ApprovalCommentSchema = z.object({
  id: z.string().uuid(),
  approval_id: z.string().uuid(),
  author_type: z.enum(['agent', 'client']),
  author_id: z.string().uuid().optional().nullable(),
  content: z.string(),
  created_at: z.string(),
});

export type ApprovalComment = z.infer<typeof ApprovalCommentSchema>;

import { z } from 'zod';

export enum AgreementStatus {
  DRAFT = 'draft',
  GENERATED = 'pending',
  PENDING = 'pending',
  SENT = 'sent',
  VIEWED = 'viewed',
  SIGNED = 'signed',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export const AgreementStatusEnum = z.nativeEnum(AgreementStatus);

export const ClientSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Client = z.infer<typeof ClientSchema>;

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  content: z.any().optional().nullable(), // generic JSONB content
  created_at: z.string(),
  updated_at: z.string(),
});
export type Template = z.infer<typeof TemplateSchema>;

export const ClauseSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  template_id: z.string().uuid().optional().nullable(),
  title: z.string(),
  content: z.string(),
  is_mandatory: z.boolean(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Clause = z.infer<typeof ClauseSchema>;

export const MatterTypeSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MatterType = z.infer<typeof MatterTypeSchema>;

export const PaymentScheduleSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  agreement_id: z.string().uuid(),
  total_amount: z.number(),
  currency: z.string(),
  status: z.string(),
  milestones: z.array(z.any()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  entity_type: z.literal('agreement'),
  entity_id: z.string().uuid(),
  action: z.string(),
  description: z.string().optional().nullable(),
  metadata: z.any().optional(),
  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  created_at: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AgreementSchema = z.object({
  id: z.string(),
  agency_id: z.string(),
  created_by: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  agreement_number: z.string().optional().nullable(),
  status: z.union([AgreementStatusEnum, z.string()]).transform((s) => {
    const values = Object.values(AgreementStatus) as string[];
    return values.includes(s) ? (s as AgreementStatus) : AgreementStatus.DRAFT;
  }),
  template_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  matter_type_id: z.string().uuid().optional().nullable(),
  client_name: z.string().optional().nullable(),
  client_email: z.string().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  sent_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  total_signers: z.number().default(1),
  signwell_document_id: z.string().optional().nullable(),
  signwell_status: z.string().optional().nullable(),
  signing_url: z.string().optional().nullable(),
  agent_signed_at: z.string().optional().nullable(),
  agent_signature_url: z.string().optional().nullable(),
  agent_signer_user_id: z.string().uuid().optional().nullable(),
  signed_pdf_storage_path: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().optional().nullable(),
});
export type Agreement = z.infer<typeof AgreementSchema>;

export const APPROVAL_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'approved',
  'changes_requested',
  'expired',
] as const;

export type ApplicationApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type ApplicationApprovalRecord = {
  id: string;
  agency_id: string;
  client_id: string;
  matter_id: string | null;
  created_by: string;
  status: ApplicationApprovalStatus | string;
  application_file_path: string | null;
  application_file_name: string | null;
  application_file_size: number | null;
  message_subject: string | null;
  message_body: string | null;
  approval_token: string | null;
  token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  changes_requested_at: string | null;
  client_name_confirmed: string | null;
  client_ip: string | null;
  client_user_agent: string | null;
  change_request_reason: string | null;
  matter_reference: string | null;
  visa_subclass: string | null;
  visa_stream: string | null;
  approval_record_storage_path: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; email: string; phone?: string | null } | null;
};

export type MatterOption = {
  matterId: string | null;
  fileSource: 'agreement' | 'application_approval' | 'matter';
  fileId: string;
  fileNumber: string;
  visaSubclass: string | null;
  visaStream: string | null;
  label: string;
};

export type ApprovalWizardDraft = {
  clientId: string;
  clientName: string;
  clientEmail: string;
  matterId: string | null;
  fileSource: string;
  fileId: string;
  matterReference: string;
  visaSubclass: string;
  messageSubject: string;
  messageBody: string;
};

export const DEFAULT_MESSAGE_BODY = (
  clientName: string,
  agentName: string,
) => `Dear ${clientName},

Please find attached your completed application for review.

Please review carefully.

If everything is correct, approve for lodgement.

Regards,
${agentName}`;

export function defaultMessageSubject(matterReference: string) {
  return `Application for Review & Approval — ${matterReference}`;
}

export const TOKEN_TTL_DAYS = 90;

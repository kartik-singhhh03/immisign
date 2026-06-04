export interface SignWellCopiedContact {
  email: string;
  name?: string;
}

export interface SignWellSignerRequest {
  id?: string;
  name: string;
  email: string;
  routing_order?: number;
  role?: string;
  message?: string;
  send_email?: boolean;
  send_email_delay?: number;
}

export interface SignWellField {
  api_id?: string;
  type: 'signature' | 'date' | 'text' | 'checkbox' | 'initials';
  recipient_id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  name?: string;
  label?: string;
}

export interface SignWellFileRequest {
  name: string;
  file_base64?: string;
  file_url?: string;
}

export interface SignWellDocumentRequest {
  test_mode?: boolean;
  files: SignWellFileRequest[];
  name: string;
  subject?: string;
  message?: string;
  recipients: SignWellSignerRequest[];
  expires_in?: number;
  reminders?: boolean;
  copied_contacts?: SignWellCopiedContact[];
  custom_requester_email?: string;
  apply_signing_order?: boolean;
  decline_redirect_url?: string;
  redirect_url?: string;
  with_signature_page?: boolean;
  text_tags?: boolean;
  apply_signing_order?: boolean;
  fields?: SignWellField[][];
  draft?: boolean;
}

export interface SignWellDocumentResponse {
  id: string;
  archived: boolean;
  status: string; // 'Draft', 'Action Required', 'Completed', 'Declined', 'Canceled'
  name: string;
  signers?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    signing_url?: string;
  }>;
  recipients?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    signing_url?: string;
    send_email?: boolean;
  }>;
  files: Array<{
    name: string;
    file_base64: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface WebhookEventPayload {
  event: {
    event: string; // e.g., 'document_completed'
    hash: string;
    time: string;
  };
  document: {
    id: string;
    status: string;
    archived: boolean;
    name: string;
    requester_email: string;
    created_at: string;
    updated_at: string;
  };
}

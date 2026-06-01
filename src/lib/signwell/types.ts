export interface SignWellSignerRequest {
  id?: string;
  name: string;
  email: string;
  routing_order?: number;
  message?: string;
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
  apply_signing_order?: boolean;
  decline_redirect_url?: string;
  redirect_url?: string;
  with_signature_page?: boolean;
  draft?: boolean;
}

export interface SignWellDocumentResponse {
  id: string;
  archived: boolean;
  status: string; // 'Draft', 'Action Required', 'Completed', 'Declined', 'Canceled'
  name: string;
  signers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    signing_url?: string;
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

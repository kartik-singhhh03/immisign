export type IssuedStage = 'during_matter' | 'on_completion';

export type ServiceStatementStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'viewed'
  | 'acknowledged';

export type ServiceCatalogItem = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
};

export type ServiceStatementItem = {
  id: string;
  statement_id: string;
  line_type: string;
  description: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
};

export type ServiceStatement = {
  id: string;
  agency_id: string;
  client_id: string | null;
  agreement_id: string | null;
  approval_id: string | null;
  matter_type_id: string | null;
  created_by?: string | null;
  statement_number: string | null;
  status: ServiceStatementStatus;
  issued_stage: IssuedStage;
  client_name: string | null;
  client_number: string | null;
  client_email: string | null;
  client_phone: string | null;
  visa_subclass: string | null;
  services_completed_at: string | null;
  services_notes: string | null;
  professional_fee: number | null;
  government_fee: number | null;
  disbursements: number | null;
  total_received: number | null;
  quoted_professional_fee: number | null;
  payment_terms: string | null;
  payment_dates: string | null;
  payment_methods: string[] | null;
  document_path: string | null;
  review_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  generated_at: string | null;
  acknowledged_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  items?: ServiceStatementItem[];
};

export type ClientSosContext = {
  client: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    client_number: string | null;
  };
  visa_subclass: string | null;
  agreement_id: string | null;
  approval_id: string | null;
  file_source: 'agreement' | 'application_approval' | null;
  file_id: string | null;
  file_number: string | null;
  fees: {
    professional_fee: number;
    government_fee: number;
    disbursements: number;
    quoted_professional_fee: number;
  };
};

export type SaveSosDraftInput = {
  client_id: string;
  client_name?: string;
  client_number?: string;
  client_email?: string;
  client_phone?: string;
  visa_subclass?: string;
  agreement_id?: string | null;
  approval_id?: string | null;
  matter_type_id?: string | null;
  services_completed_at?: string;
  services_notes?: string;
  issued_stage?: IssuedStage;
  selected_service_ids?: string[];
  professional_fee?: number;
  government_fee?: number;
  disbursements?: number;
  quoted_professional_fee?: number;
  payment_terms?: string;
  payment_dates?: string;
  payment_methods?: string[];
};

-- Application Approval: client signing + certificate of approval

ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
  ADD COLUMN IF NOT EXISTS client_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS certificate_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_application_approvals_signwell
  ON public.application_approvals (agency_id, signwell_document_id)
  WHERE signwell_document_id IS NOT NULL AND deleted_at IS NULL;

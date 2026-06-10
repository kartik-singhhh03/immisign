-- Persist SignWell signed application PDF path on approvals

ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS signed_document_path TEXT;

CREATE INDEX IF NOT EXISTS idx_application_approvals_signed_doc
  ON public.application_approvals (agency_id, signed_document_path)
  WHERE signed_document_path IS NOT NULL AND deleted_at IS NULL;

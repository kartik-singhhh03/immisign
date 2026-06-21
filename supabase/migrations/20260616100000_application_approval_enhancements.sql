-- APPLICATION-APPROVAL-ENHANCEMENTS-1: compliance record PDF path
ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS approval_record_storage_path TEXT;

COMMENT ON COLUMN public.application_approvals.approval_record_storage_path IS
  'Supabase documents bucket path for Application Approval Record PDF (compliance evidence)';

-- MM-4: Matter-scoped completion metadata (not client-wide)

ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS matter_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matter_completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matter_completion_reason TEXT,
  ADD COLUMN IF NOT EXISTS on_hold_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_application_approvals_matter_completed
  ON public.application_approvals (agency_id, client_id, matter_completed_at)
  WHERE matter_completed_at IS NOT NULL AND deleted_at IS NULL;

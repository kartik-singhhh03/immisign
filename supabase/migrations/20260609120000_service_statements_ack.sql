-- Statement of Service: send + acknowledgement tracking

ALTER TABLE public.service_statements
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_stage TEXT NOT NULL DEFAULT 'during_matter';

ALTER TABLE public.service_statements
  DROP CONSTRAINT IF EXISTS service_statements_issued_stage_check;

ALTER TABLE public.service_statements
  ADD CONSTRAINT service_statements_issued_stage_check
  CHECK (issued_stage IN ('during_matter', 'on_completion'));

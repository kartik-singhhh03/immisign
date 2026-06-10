-- Client profile matter details: visa stream on matter records

ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS visa_stream TEXT;

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS visa_stream TEXT;

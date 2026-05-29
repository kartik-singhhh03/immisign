-- Prepare schema for SignWell Idempotency & Tracking

-- Alter tracking for agreement external state
ALTER TABLE public.agreements
ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
ADD COLUMN IF NOT EXISTS signwell_status TEXT,
ADD COLUMN IF NOT EXISTS signwell_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signwell_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signwell_declined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signing_url TEXT;

-- Alter tracking for external signers
ALTER TABLE public.signers
ADD COLUMN IF NOT EXISTS signwell_signer_id TEXT,
ADD COLUMN IF NOT EXISTS signing_url TEXT,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Establish Webhook Events extension to ensure strict Idempotency
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS event_id TEXT;
-- We need to guarantee event_id per provider is completely unique so a constraint block halts processing on DB level
ALTER TABLE public.webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_provider_event_id_key;
ALTER TABLE public.webhook_logs ADD CONSTRAINT webhook_logs_provider_event_id_key UNIQUE (provider, event_id);

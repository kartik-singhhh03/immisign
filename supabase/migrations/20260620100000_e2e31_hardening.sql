-- E2E-3.1: agreement_signatures audit, webhook payload_hash

ALTER TABLE public.agreement_signatures
  ADD COLUMN IF NOT EXISTS signer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signer_email TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'signwell',
  ADD COLUMN IF NOT EXISTS provider_document_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_event_id UUID;

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS payload_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_signatures_idempotent
  ON public.agreement_signatures (agreement_id, provider, provider_document_id, signer_email)
  WHERE provider_document_id IS NOT NULL AND signer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_hash
  ON public.webhook_events (payload_hash)
  WHERE payload_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_status_provider
  ON public.webhook_events (provider, status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_audit_type
  ON public.email_delivery_audit (email_type, created_at DESC)
  WHERE email_type IS NOT NULL;

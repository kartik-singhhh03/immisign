-- Phase 10: Auto-applied agent/RMA signatures on send

ALTER TABLE public.rmas
  ADD COLUMN IF NOT EXISTS signature_mode TEXT CHECK (signature_mode IN ('upload', 'typed')),
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_text TEXT;

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agent_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_signature_text TEXT,
  ADD COLUMN IF NOT EXISTS agent_signer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sender_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sender_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS sender_signature_text TEXT,
  ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rmas.signature_mode IS 'upload | typed — practitioner signature for auto-apply on send';
COMMENT ON COLUMN public.agreements.agent_signed_at IS 'Timestamp when responsible RMA signature was auto-applied at send';

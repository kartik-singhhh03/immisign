-- Phase 17: Production schema sync (signup, SignWell send, agent attestation, invite flow)
-- Idempotent — safe on remote Supabase that may have partial prior migrations.

-- ---------------------------------------------------------------------------
-- Documents: agent send + SignWell dispatch tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sender_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sender_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS sender_signature_text TEXT,
  ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_attestation_path TEXT,
  ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
  ADD COLUMN IF NOT EXISTS signwell_status TEXT,
  ADD COLUMN IF NOT EXISTS signwell_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signwell_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signwell_declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signwell_dispatch_error TEXT,
  ADD COLUMN IF NOT EXISTS signwell_external_signer_count INT,
  ADD COLUMN IF NOT EXISTS signwell_signing_links JSONB;

COMMENT ON COLUMN public.documents.sender_attestation_path IS
  'Storage path for Agent-Certification.pdf (agent pre-signed; not a SignWell signer step).';
COMMENT ON COLUMN public.documents.signwell_signing_links IS
  'Snapshot of SignWell recipient signing URLs after successful dispatch (audit/support).';
COMMENT ON COLUMN public.documents.signwell_dispatch_error IS
  'Last SignWell dispatch failure message for retry UX.';

CREATE INDEX IF NOT EXISTS idx_documents_signwell_document_id
  ON public.documents(signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_agency_signwell_status
  ON public.documents(agency_id, signwell_status)
  WHERE signwell_document_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Signers: standalone document sends (Phase 4B + role label)
-- ---------------------------------------------------------------------------
ALTER TABLE public.signers
  ALTER COLUMN agreement_id DROP NOT NULL;

ALTER TABLE public.signers
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role TEXT;

CREATE INDEX IF NOT EXISTS idx_signers_document_id
  ON public.signers(document_id)
  WHERE document_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Send-document wizard drafts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.send_document_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

ALTER TABLE public.send_document_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'send_document_drafts'
      AND policyname = 'Users manage own send document drafts'
  ) THEN
    CREATE POLICY "Users manage own send document drafts"
      ON public.send_document_drafts
      FOR ALL TO authenticated
      USING (user_id = auth.uid() AND agency_id = public.get_tenant())
      WITH CHECK (user_id = auth.uid() AND agency_id = public.get_tenant());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Invitations: invite-accept API fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS marn TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_invitations_token_pending
  ON public.invitations(token)
  WHERE accepted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Agencies: workspace URL (signup slug uniqueness enforced at app layer)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS agencies_slug_unique_idx ON public.agencies(slug);

-- ---------------------------------------------------------------------------
-- Security audit (Phase 16) — ensure table exists on older remotes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_label TEXT,
  browser_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_agency_created
  ON public.security_audit_logs (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_created
  ON public.security_audit_logs (user_id, created_at DESC);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_audit_logs'
      AND policyname = 'security_audit_logs_select_agency'
  ) THEN
    CREATE POLICY security_audit_logs_select_agency
      ON public.security_audit_logs FOR SELECT TO authenticated
      USING (agency_id = public.get_tenant());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_audit_logs'
      AND policyname = 'security_audit_logs_insert_own'
  ) THEN
    CREATE POLICY security_audit_logs_insert_own
      ON public.security_audit_logs FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_recovery_codes JSONB;

-- ---------------------------------------------------------------------------
-- RMA signatures (agent auto-sign on send)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rmas
  ADD COLUMN IF NOT EXISTS signature_mode TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_text TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rmas_signature_mode_check'
  ) THEN
    ALTER TABLE public.rmas
      ADD CONSTRAINT rmas_signature_mode_check
      CHECK (signature_mode IS NULL OR signature_mode IN ('upload', 'typed'));
  END IF;
END $$;

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agent_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_signature_text TEXT,
  ADD COLUMN IF NOT EXISTS agent_signer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

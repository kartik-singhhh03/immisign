-- Native Agreement Signing V1
-- Adds native signing columns, user signature convenience fields, lifecycle guards.
-- SignWell columns and flows remain unchanged.

-- ─── Users: denormalized default signature pointer ───────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signature_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.signature_storage_path IS
  'Storage path to default agent signature PNG; synced from user_signatures.is_default';
COMMENT ON COLUMN public.users.signature_uploaded_at IS
  'When the default agent signature was last uploaded or replaced';

-- ─── Agreements: native signing fields ───────────────────────────────────────
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS signing_provider TEXT
    CHECK (signing_provider IS NULL OR signing_provider IN ('native', 'signwell')),
  ADD COLUMN IF NOT EXISTS signing_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS signing_record_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS client_signature_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_ip TEXT,
  ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS client_name_confirmed TEXT,
  ADD COLUMN IF NOT EXISTS pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS signature_hash TEXT,
  ADD COLUMN IF NOT EXISTS audit_hash TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS signing_record_hash TEXT;

-- Unique signing token (partial — only non-deleted rows with token)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agreements_signing_token
  ON public.agreements (signing_token)
  WHERE signing_token IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agreements_signing_provider
  ON public.agreements (agency_id, signing_provider)
  WHERE deleted_at IS NULL;

-- Backfill signing_provider for existing SignWell agreements
UPDATE public.agreements
SET signing_provider = 'signwell'
WHERE signing_provider IS NULL
  AND signwell_document_id IS NOT NULL;

COMMENT ON COLUMN public.agreements.signing_provider IS
  'Dispatch provider: native (ImmiSign portal) or signwell (legacy). Set at send time.';
COMMENT ON COLUMN public.agreements.signing_token IS
  'Opaque token for /agreement/sign/{token} native client portal';
COMMENT ON COLUMN public.agreements.signed_pdf_storage_path IS
  'Final executed PDF with client signature embedded';
COMMENT ON COLUMN public.agreements.signing_record_storage_path IS
  'Compliance Agreement Signing Record PDF';

-- ─── Lifecycle guard: never revert completed → draft ─────────────────────────
CREATE OR REPLACE FUNCTION public.agreements_prevent_completed_revert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot revert completed agreement to draft';
  END IF;
  IF OLD.status IN ('signed', 'completed') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot revert signed agreement to draft';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agreements_prevent_completed_revert ON public.agreements;
CREATE TRIGGER agreements_prevent_completed_revert
  BEFORE UPDATE OF status ON public.agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.agreements_prevent_completed_revert();

-- ─── Sync users.signature_storage_path from default user_signatures ──────────
CREATE OR REPLACE FUNCTION public.sync_user_default_signature_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true AND NEW.storage_path IS NOT NULL THEN
    UPDATE public.users
    SET
      signature_storage_path = NEW.storage_path,
      signature_uploaded_at = COALESCE(NEW.updated_at, NOW()),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_default_signature_path ON public.user_signatures;
CREATE TRIGGER sync_user_default_signature_path
  AFTER INSERT OR UPDATE OF is_default, storage_path ON public.user_signatures
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.sync_user_default_signature_path();

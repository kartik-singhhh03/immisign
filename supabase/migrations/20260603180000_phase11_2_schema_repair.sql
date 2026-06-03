-- Phase 11.2: Idempotent repair for columns/tables that may be missing on remote Supabase
-- Safe to run multiple times.

-- Auto agent signatures (Phase 10)
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

-- Send document + SignWell linkage (Phase 11.1)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
  ADD COLUMN IF NOT EXISTS signwell_status TEXT,
  ADD COLUMN IF NOT EXISTS signwell_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signwell_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_signwell_document_id
  ON public.documents(signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;

-- Single-plan billing columns (Phase 10) on subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS included_seats INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billable_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_base_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_seat_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_seat_item_id TEXT;

-- Application approvals RLS (Phase 11.1) — policies only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'application_approvals'
      AND policyname = 'tenant_application_approvals_select'
  ) THEN
    CREATE POLICY "tenant_application_approvals_select"
      ON public.application_approvals FOR SELECT TO authenticated
      USING (agency_id = public.get_tenant() AND deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'application_approvals'
      AND policyname = 'tenant_application_approvals_insert'
  ) THEN
    CREATE POLICY "tenant_application_approvals_insert"
      ON public.application_approvals FOR INSERT TO authenticated
      WITH CHECK (
        agency_id = public.get_tenant()
        AND created_by = auth.uid()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'application_approvals'
      AND policyname = 'tenant_application_approvals_update'
  ) THEN
    CREATE POLICY "tenant_application_approvals_update"
      ON public.application_approvals FOR UPDATE TO authenticated
      USING (
        agency_id = public.get_tenant()
        AND deleted_at IS NULL
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'application_approvals'
      AND policyname = 'tenant_application_approvals_delete'
  ) THEN
    CREATE POLICY "tenant_application_approvals_delete"
      ON public.application_approvals FOR DELETE TO authenticated
      USING (
        agency_id = public.get_tenant()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approval_comments'
      AND policyname = 'tenant_approval_comments_select'
  ) THEN
    CREATE POLICY "tenant_approval_comments_select"
      ON public.approval_comments FOR SELECT TO authenticated
      USING (
        approval_id IN (
          SELECT id FROM public.application_approvals
          WHERE agency_id = public.get_tenant() AND deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approval_comments'
      AND policyname = 'tenant_approval_comments_insert'
  ) THEN
    CREATE POLICY "tenant_approval_comments_insert"
      ON public.approval_comments FOR INSERT TO authenticated
      WITH CHECK (
        approval_id IN (
          SELECT id FROM public.application_approvals
          WHERE agency_id = public.get_tenant()
            AND deleted_at IS NULL
            AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
        )
        AND author_type = 'agent'
        AND (author_id IS NULL OR author_id = auth.uid())
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approval_comments'
      AND policyname = 'tenant_approval_comments_delete'
  ) THEN
    CREATE POLICY "tenant_approval_comments_delete"
      ON public.approval_comments FOR DELETE TO authenticated
      USING (
        approval_id IN (
          SELECT id FROM public.application_approvals
          WHERE agency_id = public.get_tenant()
        )
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.send_document_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL DEFAULT '{}',
    current_step INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (agency_id, user_id)
);

ALTER TABLE public.send_document_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'send_document_drafts'
      AND policyname = 'Users manage own send document drafts'
  ) THEN
    CREATE POLICY "Users manage own send document drafts"
      ON public.send_document_drafts
      FOR ALL TO authenticated
      USING (user_id = auth.uid() AND agency_id = public.get_tenant())
      WITH CHECK (user_id = auth.uid() AND agency_id = public.get_tenant());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 11.1: Production hardening (RLS, send-document drafts, SignWell linkage)

-- Application approvals RLS
CREATE POLICY "tenant_application_approvals_select"
  ON public.application_approvals FOR SELECT TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND deleted_at IS NULL
  );

CREATE POLICY "tenant_application_approvals_insert"
  ON public.application_approvals FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND created_by = auth.uid()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

CREATE POLICY "tenant_application_approvals_update"
  ON public.application_approvals FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND deleted_at IS NULL
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

CREATE POLICY "tenant_application_approvals_delete"
  ON public.application_approvals FOR DELETE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "tenant_approval_comments_select"
  ON public.approval_comments FOR SELECT TO authenticated
  USING (
    approval_id IN (
      SELECT id FROM public.application_approvals
      WHERE agency_id = public.get_tenant() AND deleted_at IS NULL
    )
  );

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

CREATE POLICY "tenant_approval_comments_delete"
  ON public.approval_comments FOR DELETE TO authenticated
  USING (
    approval_id IN (
      SELECT id FROM public.application_approvals
      WHERE agency_id = public.get_tenant()
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Standalone document SignWell tracking
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
  ADD COLUMN IF NOT EXISTS signwell_status TEXT,
  ADD COLUMN IF NOT EXISTS signwell_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signwell_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_signwell_document_id
  ON public.documents(signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;

-- Send-document wizard persistence (per user/agency)
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

CREATE POLICY "Users manage own send document drafts"
    ON public.send_document_drafts
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND agency_id = public.get_tenant())
    WITH CHECK (user_id = auth.uid() AND agency_id = public.get_tenant());

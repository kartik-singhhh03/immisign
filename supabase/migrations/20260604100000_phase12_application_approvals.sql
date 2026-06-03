-- Phase 12: Application Approval Module (internal workflow + checklist + attachments)

-- Extend notification enum
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'approval';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Approval number counter per agency/year
CREATE TABLE IF NOT EXISTS public.approval_number_counters (
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, year)
);

ALTER TABLE public.approval_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_approval_counters_all"
  ON public.approval_number_counters FOR ALL TO authenticated
  USING (agency_id = public.get_tenant())
  WITH CHECK (agency_id = public.get_tenant());

CREATE OR REPLACE FUNCTION public.next_approval_number(p_agency_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW())::INT;
  v_num INT;
BEGIN
  INSERT INTO public.approval_number_counters (agency_id, year, last_number)
  VALUES (p_agency_id, v_year, 1)
  ON CONFLICT (agency_id, year)
  DO UPDATE SET last_number = public.approval_number_counters.last_number + 1
  RETURNING last_number INTO v_num;

  RETURN 'APP-' || v_year::TEXT || '-' || LPAD(v_num::TEXT, 4, '0');
END;
$$;

-- Extend application_approvals
ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS approval_number TEXT,
  ADD COLUMN IF NOT EXISTS matter_type_id UUID REFERENCES public.matter_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matter_reference TEXT,
  ADD COLUMN IF NOT EXISTS assigned_reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_rma_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_to_lodge_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lodged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_application_approvals_agency_number
  ON public.application_approvals (agency_id, approval_number)
  WHERE approval_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_approvals_agency_status
  ON public.application_approvals (agency_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_approvals_reviewer
  ON public.application_approvals (agency_id, assigned_reviewer_id)
  WHERE deleted_at IS NULL;

-- Status backfill (legacy client-review → internal workflow)
UPDATE public.application_approvals SET status = 'submitted' WHERE status = 'pending_review';
UPDATE public.application_approvals SET status = 'under_review' WHERE status = 'viewed';
UPDATE public.application_approvals SET status = 'closed' WHERE status = 'archived';

-- Extend approval_comments
ALTER TABLE public.approval_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.approval_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS author_role TEXT,
  ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE POLICY "tenant_approval_comments_update"
  ON public.approval_comments FOR UPDATE TO authenticated
  USING (
    approval_id IN (
      SELECT id FROM public.application_approvals
      WHERE agency_id = public.get_tenant() AND deleted_at IS NULL
    )
    AND (author_id IS NULL OR author_id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

-- Attachments
CREATE TABLE IF NOT EXISTS public.approval_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES public.application_approvals(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  version_number INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_attachments_approval
  ON public.approval_attachments (approval_id, is_current DESC, created_at DESC);

ALTER TABLE public.approval_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_approval_attachments_select"
  ON public.approval_attachments FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY "tenant_approval_attachments_insert"
  ON public.approval_attachments FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND uploaded_by = auth.uid()
    AND approval_id IN (
      SELECT id FROM public.application_approvals
      WHERE agency_id = public.get_tenant() AND deleted_at IS NULL
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent', 'support')
  );

CREATE POLICY "tenant_approval_attachments_delete"
  ON public.approval_attachments FOR DELETE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Checklist items (per approval)
CREATE TABLE IF NOT EXISTS public.approval_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES public.application_approvals(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (approval_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_approval_checklist_approval
  ON public.approval_checklist_items (approval_id, sort_order);

ALTER TABLE public.approval_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_approval_checklist_select"
  ON public.approval_checklist_items FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY "tenant_approval_checklist_insert"
  ON public.approval_checklist_items FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant());

CREATE POLICY "tenant_approval_checklist_update"
  ON public.approval_checklist_items FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent', 'support')
  );

-- Tighten application_approvals update: agents may only update own drafts
DROP POLICY IF EXISTS "tenant_application_approvals_update" ON public.application_approvals;

CREATE POLICY "tenant_application_approvals_update"
  ON public.application_approvals FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND deleted_at IS NULL
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
      OR (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('manager', 'agent')
        AND (
          status = 'draft' AND created_by = auth.uid()
          OR status NOT IN ('draft', 'closed', 'rejected')
        )
      )
      OR (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'support'
        AND assigned_reviewer_id = auth.uid()
      )
    )
  );

-- Select: support sees assigned; viewer sees all read-only via app layer
DROP POLICY IF EXISTS "tenant_application_approvals_select" ON public.application_approvals;

CREATE POLICY "tenant_application_approvals_select"
  ON public.application_approvals FOR SELECT TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND deleted_at IS NULL
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent', 'viewer', 'reviewer')
      OR (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'support'
        AND (assigned_reviewer_id = auth.uid() OR created_by = auth.uid())
      )
    )
  );

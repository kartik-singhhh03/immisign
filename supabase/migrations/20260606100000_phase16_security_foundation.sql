-- Phase 16: Security audit logs + Statement of Service foundation

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

CREATE POLICY security_audit_logs_select_agency
  ON public.security_audit_logs FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY security_audit_logs_insert_own
  ON public.security_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_recovery_codes JSONB;

-- Statement of Service foundation (module not built yet)
CREATE TABLE IF NOT EXISTS public.service_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES public.agreements(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES public.application_approvals(id) ON DELETE SET NULL,
  matter_type_id UUID REFERENCES public.matter_types(id) ON DELETE SET NULL,
  statement_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  visa_subclass TEXT,
  matter_reference TEXT,
  issued_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.service_statement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES public.service_statements(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL DEFAULT 'service',
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) DEFAULT 1,
  unit_amount NUMERIC(12,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_statements_agency
  ON public.service_statements (agency_id) WHERE deleted_at IS NULL;

ALTER TABLE public.service_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_statement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_statements_tenant ON public.service_statements
  FOR ALL TO authenticated
  USING (agency_id = public.get_tenant())
  WITH CHECK (agency_id = public.get_tenant());

CREATE POLICY service_statement_items_tenant ON public.service_statement_items
  FOR ALL TO authenticated
  USING (agency_id = public.get_tenant())
  WITH CHECK (agency_id = public.get_tenant());

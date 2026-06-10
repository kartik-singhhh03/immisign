-- ONB-1/2/3: Unified client+matter onboarding, applicant normalization, document audit

-- Client profile extensions
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Financial settings (agency-configured; NULL = no surcharge applied)
ALTER TABLE public.matter_defaults
  ADD COLUMN IF NOT EXISTS card_processing_surcharge_percent NUMERIC(5,2);

COMMENT ON COLUMN public.matter_defaults.card_processing_surcharge_percent IS
  'Card processing surcharge % applied to visa/government fees. NULL until agency configures.';

-- Canonical matter record (ONB intake anchor)
CREATE TABLE IF NOT EXISTS public.matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  matter_type_id UUID NOT NULL REFERENCES public.matter_types(id),
  visa_subclass TEXT NOT NULL,
  visa_stream TEXT,
  assigned_rma_id UUID NOT NULL REFERENCES public.users(id),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  agreement_id UUID REFERENCES public.agreements(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES public.application_approvals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'onboarding',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matters_agency_client ON public.matters(agency_id, client_id);

-- Normalized applicants per matter
CREATE TABLE IF NOT EXISTS public.matter_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary', 'dependent', 'sponsor')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matter_applicants_matter ON public.matter_applicants(matter_id, role);

-- Financial snapshot at onboarding
CREATE TABLE IF NOT EXISTS public.matter_financials (
  matter_id UUID PRIMARY KEY REFERENCES public.matters(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  professional_fee NUMERIC(12,2) NOT NULL,
  deposit NUMERIC(12,2) NOT NULL,
  visa_fees NUMERIC(12,2) NOT NULL,
  visa_fee_surcharge NUMERIC(12,2) NOT NULL DEFAULT 0,
  surcharge_percent_applied NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only document audit trail
CREATE TABLE IF NOT EXISTS public.document_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('service_agreement', 'application_approval', 'statement_of_service', 'certificate')),
  document_id UUID NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('sent', 'viewed', 'signed', 'acknowledged', 'completed', 'generated')),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_name TEXT,
  actor_email TEXT,
  ip_address TEXT,
  provider TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_client ON public.document_audit_events(agency_id, client_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_document ON public.document_audit_events(document_type, document_id, event_timestamp DESC);

-- Agreement signature audit columns
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS signature_provider TEXT,
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL;

ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS signature_provider TEXT,
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL;

ALTER TABLE public.service_statements
  ADD COLUMN IF NOT EXISTS acknowledged_ip TEXT,
  ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matters_tenant ON public.matters;
CREATE POLICY matters_tenant ON public.matters FOR ALL TO authenticated
  USING (agency_id = public.get_tenant()) WITH CHECK (agency_id = public.get_tenant());

DROP POLICY IF EXISTS matter_applicants_tenant ON public.matter_applicants;
CREATE POLICY matter_applicants_tenant ON public.matter_applicants FOR ALL TO authenticated
  USING (agency_id = public.get_tenant()) WITH CHECK (agency_id = public.get_tenant());

DROP POLICY IF EXISTS matter_financials_tenant ON public.matter_financials;
CREATE POLICY matter_financials_tenant ON public.matter_financials FOR ALL TO authenticated
  USING (agency_id = public.get_tenant()) WITH CHECK (agency_id = public.get_tenant());

DROP POLICY IF EXISTS document_audit_events_select ON public.document_audit_events;
CREATE POLICY document_audit_events_select ON public.document_audit_events FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

DROP POLICY IF EXISTS document_audit_events_insert ON public.document_audit_events;
CREATE POLICY document_audit_events_insert ON public.document_audit_events FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant());

-- No UPDATE/DELETE policies on document_audit_events (append-only)

DROP TRIGGER IF EXISTS update_matters_updated_at ON public.matters;
CREATE TRIGGER update_matters_updated_at BEFORE UPDATE ON public.matters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_matter_applicants_updated_at ON public.matter_applicants;
CREATE TRIGGER update_matter_applicants_updated_at BEFORE UPDATE ON public.matter_applicants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROD-PRECHECK: compliance_events + locked SoS compliance template storage

CREATE TABLE IF NOT EXISTS public.compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  file_source TEXT CHECK (file_source IS NULL OR file_source IN ('agreement', 'application_approval')),
  file_id UUID,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_agency_type
  ON public.compliance_events (agency_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_events_client
  ON public.compliance_events (client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_compliance_events_select" ON public.compliance_events
  FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY "tenant_compliance_events_insert" ON public.compliance_events
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant());

-- Locked SoS compliance disclosure — seeded once per agency, editable only via settings (owner/admin)
ALTER TABLE public.matter_defaults
  ADD COLUMN IF NOT EXISTS sos_compliance_disclosure TEXT;

COMMENT ON COLUMN public.matter_defaults.sos_compliance_disclosure IS
  'Locked Statement of Service compliance disclosure text. Agents cannot edit in wizard.';

-- Seed default disclosure for agencies missing one (one-time migration seed, not React hardcode)
UPDATE public.matter_defaults
SET sos_compliance_disclosure = COALESCE(
  sos_compliance_disclosure,
  'This Statement of Service is issued in accordance with the Code of Conduct for Registered Migration Agents under the Migration Act 1958.

The services described above have been provided by a Registered Migration Agent in a professional and ethical manner consistent with the obligations set out in the Code of Conduct.

File Retention: Your client file will be retained for a minimum of seven (7) years from the date of this statement in accordance with regulatory requirements.

Complaints: If you have concerns regarding services provided, you may contact the Office of the Migration Agents Registration Authority (OMARA) at omara.immi.gov.au or on 1300 226 272. You may also contact the Commonwealth Ombudsman at ombudsman.gov.au.'
)
WHERE sos_compliance_disclosure IS NULL;

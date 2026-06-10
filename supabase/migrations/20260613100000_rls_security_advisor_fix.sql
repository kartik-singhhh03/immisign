-- Supabase Security Advisor: enable RLS on public tables exposed via PostgREST
-- Tables: schema_migrations, agreement_reference_counters

-- Internal migration ledger — not for client API access
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.schema_migrations FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.schema_migrations TO service_role;

-- Agency-scoped agreement reference sequence counters
ALTER TABLE public.agreement_reference_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agreement_reference_counters_tenant ON public.agreement_reference_counters;
CREATE POLICY agreement_reference_counters_tenant
  ON public.agreement_reference_counters
  FOR ALL TO authenticated
  USING (agency_id = public.get_tenant())
  WITH CHECK (agency_id = public.get_tenant());

REVOKE ALL ON TABLE public.agreement_reference_counters FROM anon;

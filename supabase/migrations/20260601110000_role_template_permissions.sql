-- Role-based template write restrictions (read-only / assistant cannot mutate templates)

DROP POLICY IF EXISTS "tenant_templates_insert" ON public.templates;
DROP POLICY IF EXISTS "tenant_templates_update" ON public.templates;
DROP POLICY IF EXISTS "tenant_templates_delete" ON public.templates;

CREATE POLICY "tenant_templates_insert" ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

CREATE POLICY "tenant_templates_update" ON public.templates
  FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

CREATE POLICY "tenant_templates_delete" ON public.templates
  FOR DELETE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'agent')
  );

-- Subscriptions: only owner may update billing records
DROP POLICY IF EXISTS "Users view agency subscriptions" ON public.subscriptions;

CREATE POLICY "Users view agency subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY "Owner updates agency subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owner inserts agency subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
  );

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS marn TEXT;

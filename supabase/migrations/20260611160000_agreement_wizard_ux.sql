-- Agreement Wizard UX rebuild: dynamic fee items + matter type lifecycle

ALTER TABLE public.matter_types
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.agreement_fee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  due_trigger TEXT NOT NULL DEFAULT '',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_fee_items_agreement
  ON public.agreement_fee_items(agreement_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_agreement_fee_items_agency
  ON public.agreement_fee_items(agency_id);

ALTER TABLE public.agreement_fee_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_agreement_fee_items_select" ON public.agreement_fee_items;
CREATE POLICY "tenant_agreement_fee_items_select"
  ON public.agreement_fee_items FOR SELECT TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

DROP POLICY IF EXISTS "tenant_agreement_fee_items_insert" ON public.agreement_fee_items;
CREATE POLICY "tenant_agreement_fee_items_insert"
  ON public.agreement_fee_items FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

DROP POLICY IF EXISTS "tenant_agreement_fee_items_update" ON public.agreement_fee_items;
CREATE POLICY "tenant_agreement_fee_items_update"
  ON public.agreement_fee_items FOR UPDATE TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

DROP POLICY IF EXISTS "tenant_agreement_fee_items_delete" ON public.agreement_fee_items;
CREATE POLICY "tenant_agreement_fee_items_delete"
  ON public.agreement_fee_items FOR DELETE TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

DROP TRIGGER IF EXISTS update_agreement_fee_items_updated_at ON public.agreement_fee_items;
CREATE TRIGGER update_agreement_fee_items_updated_at
  BEFORE UPDATE ON public.agreement_fee_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

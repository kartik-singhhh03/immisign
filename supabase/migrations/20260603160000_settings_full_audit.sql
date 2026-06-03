-- Settings full audit: agency profile fields, RMA team, matter types, payment schedule templates, defaults

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS principal_name TEXT,
  ADD COLUMN IF NOT EXISTS marn TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE public.matter_defaults
  ADD COLUMN IF NOT EXISTS default_scope_of_services TEXT,
  ADD COLUMN IF NOT EXISTS default_special_terms TEXT,
  ADD COLUMN IF NOT EXISTS default_payment_schedule TEXT;

ALTER TABLE public.matter_types
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.rmas
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rma_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rma_tier TEXT NOT NULL DEFAULT 'associate',
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS public.agency_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_agency_payment_schedule_label
  ON public.agency_payment_schedules (agency_id, lower(label));

ALTER TABLE public.agency_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agency_payment_schedules_select"
  ON public.agency_payment_schedules FOR SELECT TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "tenant_agency_payment_schedules_insert"
  ON public.agency_payment_schedules FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "tenant_agency_payment_schedules_update"
  ON public.agency_payment_schedules FOR UPDATE TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "tenant_agency_payment_schedules_delete"
  ON public.agency_payment_schedules FOR DELETE TO authenticated
  USING (agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()));

CREATE TRIGGER update_agency_payment_schedules_updated_at
  BEFORE UPDATE ON public.agency_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Canonical matter types (original ImmiSign baseline)
INSERT INTO public.matter_types (agency_id, name, sort_order)
SELECT a.id, v.name, v.sort_order
FROM public.agencies a
CROSS JOIN (
  VALUES
    ('Partner Visa (Onshore/Offshore)', 1),
    ('Skilled Migration', 2),
    ('Employer Sponsored', 3),
    ('Parent Visa', 4),
    ('Student Visa', 5),
    ('Visitor Visa', 6),
    ('Bridging Visa', 7),
    ('Aged Dependent Relative', 8),
    ('ART Appeal / Merits Review', 9),
    ('Character / Health Waiver', 10)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.matter_types mt WHERE mt.agency_id = a.id
);

-- Canonical payment schedule templates
INSERT INTO public.agency_payment_schedules (agency_id, label, sort_order)
SELECT a.id, v.label, v.sort_order
FROM public.agencies a
CROSS JOIN (
  VALUES
    ('50% on engagement, balance prior to lodgement', 1),
    ('100% upfront on engagement', 2),
    ('Staged: 33% on engagement, 33% on lodgement, 34% on decision', 3),
    ('Hourly rate — invoiced per block of work, due within 7 days', 4),
    ('Fixed fee — as specified in this agreement', 5)
) AS v(label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_payment_schedules ps WHERE ps.agency_id = a.id
);

-- Defaults scope/special terms baseline
UPDATE public.matter_defaults md
SET
  default_scope_of_services = COALESCE(default_scope_of_services, E'1. Verification of documents (estimated 5 hrs)\n2. Preparation and lodgement of visa application\n3. Liaison with the Department of Home Affairs\n4. Advice on Department requests (s56/s57 notices)'),
  default_special_terms = COALESCE(default_special_terms, ''),
  default_payment_schedule = COALESCE(default_payment_schedule, '50% on engagement, balance prior to lodgement')
WHERE default_scope_of_services IS NULL OR default_payment_schedule IS NULL;

INSERT INTO public.matter_defaults (agency_id, default_scope_of_services, default_special_terms, default_payment_schedule)
SELECT a.id,
  E'1. Verification of documents (estimated 5 hrs)\n2. Preparation and lodgement of visa application\n3. Liaison with the Department of Home Affairs\n4. Advice on Department requests (s56/s57 notices)',
  '',
  '50% on engagement, balance prior to lodgement'
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.matter_defaults d WHERE d.agency_id = a.id);

-- Every agency workspace gets branding, matter defaults, billing subscription stub,
-- and payment schedule templates at creation. Backfill existing agencies.

-- ---------------------------------------------------------------------------
-- RLS: allow owners/admins to create branding rows (first save / upsert insert)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins insert agency branding" ON public.branding_settings;
CREATE POLICY "Admins insert agency branding" ON public.branding_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- Provision function (runs on agency INSERT; SECURITY DEFINER for no-user window)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_agency_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.branding_settings (
    agency_id,
    primary_color,
    secondary_color,
    font_family,
    agreement_ref_prefix,
    agreement_ref_start,
    agreement_header_title,
    agreement_footer_text
  )
  VALUES (
    NEW.id,
    '#0D9F8C',
    '#081B2E',
    'Inter',
    'AGR',
    1000,
    'Migration Agent Service Agreement',
    'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.'
  )
  ON CONFLICT (agency_id) DO NOTHING;

  INSERT INTO public.matter_defaults (
    agency_id,
    default_scope_of_services,
    default_special_terms,
    default_payment_schedule
  )
  VALUES (
    NEW.id,
    E'1. Verification of documents (estimated 5 hrs)\n2. Preparation and lodgement of visa application\n3. Liaison with the Department of Home Affairs\n4. Advice on Department requests (s56/s57 notices)',
    '',
    '50% on engagement, balance prior to lodgement'
  )
  ON CONFLICT (agency_id) DO NOTHING;

  INSERT INTO public.subscriptions (
    agency_id,
    plan_name,
    billing_cycle,
    status,
    included_seats,
    billable_seats,
    additional_seats
  )
  VALUES (
    NEW.id,
    'IMMISIGN',
    'monthly',
    'trialing',
    3,
    0,
    0
  )
  ON CONFLICT (agency_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.agency_payment_schedules ps WHERE ps.agency_id = NEW.id
  ) THEN
    INSERT INTO public.agency_payment_schedules (agency_id, label, sort_order)
    SELECT NEW.id, v.label, v.sort_order
    FROM (
      VALUES
        ('50% on engagement, balance prior to lodgement', 1),
        ('100% upfront on engagement', 2),
        ('Staged: 33% on engagement, 33% on lodgement, 34% on decision', 3),
        ('Hourly rate — invoiced per block of work, due within 7 days', 4),
        ('Fixed fee — as specified in this agreement', 5)
    ) AS v(label, sort_order);
  END IF;

  UPDATE public.agencies
  SET
    subscription_status = COALESCE(subscription_status, 'trialing'::subscription_status),
    plan_type = COALESCE(plan_type, 'IMMISIGN')
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_agency_workspace ON public.agencies;
CREATE TRIGGER trg_provision_agency_workspace
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_agency_workspace();

-- ---------------------------------------------------------------------------
-- Backfill all existing agencies (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.branding_settings (
  agency_id,
  primary_color,
  secondary_color,
  font_family,
  agreement_ref_prefix,
  agreement_ref_start,
  agreement_header_title,
  agreement_footer_text
)
SELECT
  a.id,
  '#0D9F8C',
  '#081B2E',
  'Inter',
  'AGR',
  1000,
  'Migration Agent Service Agreement',
  'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.'
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.branding_settings b WHERE b.agency_id = a.id
);

INSERT INTO public.matter_defaults (
  agency_id,
  default_scope_of_services,
  default_special_terms,
  default_payment_schedule
)
SELECT
  a.id,
  E'1. Verification of documents (estimated 5 hrs)\n2. Preparation and lodgement of visa application\n3. Liaison with the Department of Home Affairs\n4. Advice on Department requests (s56/s57 notices)',
  '',
  '50% on engagement, balance prior to lodgement'
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.matter_defaults d WHERE d.agency_id = a.id
);

INSERT INTO public.subscriptions (
  agency_id,
  plan_name,
  billing_cycle,
  status,
  included_seats,
  billable_seats,
  additional_seats
)
SELECT
  a.id,
  'IMMISIGN',
  'monthly',
  'trialing'::subscription_status,
  3,
  0,
  0
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.agency_id = a.id
);

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

UPDATE public.agencies
SET
  subscription_status = COALESCE(subscription_status, 'trialing'::subscription_status),
  plan_type = COALESCE(plan_type, 'IMMISIGN')
WHERE subscription_status IS NULL OR plan_type IS NULL;

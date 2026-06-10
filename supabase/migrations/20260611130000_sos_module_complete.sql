-- Statement of Service — full module (client-centric)

-- Global service catalog
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visa subclass → default services mapping
CREATE TABLE IF NOT EXISTS public.visa_service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_subclass_key TEXT NOT NULL,
  service_catalog_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  default_selected BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visa_subclass_key, service_catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_visa_service_templates_key
  ON public.visa_service_templates (visa_subclass_key);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_catalog_read ON public.service_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY visa_service_templates_read ON public.visa_service_templates
  FOR SELECT TO authenticated USING (true);

-- Extend service_statements for full SOS workflow
ALTER TABLE public.service_statements
  ADD COLUMN IF NOT EXISTS client_number TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS services_completed_at DATE,
  ADD COLUMN IF NOT EXISTS services_notes TEXT,
  ADD COLUMN IF NOT EXISTS professional_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS government_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS disbursements NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_received NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS quoted_professional_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS payment_dates TEXT,
  ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS review_token TEXT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_statements_review_token
  ON public.service_statements (review_token)
  WHERE review_token IS NOT NULL;

-- Seed service catalog (matches prototype)
INSERT INTO public.service_catalog (code, label, sort_order) VALUES
  ('consultation', 'Initial consultation & advice', 1),
  ('skills_assessment', 'Skills assessment coordination', 2),
  ('eoi', 'EOI / SkillSelect submission', 3),
  ('visa_prep', 'Visa application preparation', 4),
  ('doc_collection', 'Document collection & review', 5),
  ('gov_forms', 'Government form completion', 6),
  ('stat_dec', 'Statutory declaration drafting', 7),
  ('rfi', 'Response to request for information (RFI)', 8),
  ('dibp_liaison', 'Liaison with Department (DIBP)', 9),
  ('health_character', 'Health & character guidance', 10),
  ('biometrics', 'Biometrics / medical coordination', 11),
  ('aat_appeal', 'ART / AAT appeal preparation', 12),
  ('bridging', 'Bridging visa application', 13),
  ('state_nomination', 'State nomination application', 14),
  ('employer_sponsorship', 'Employer sponsorship lodgement', 15)
ON CONFLICT (code) DO NOTHING;

-- Subclass 190 defaults
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT '190', id, true, sort_order FROM public.service_catalog
WHERE code IN ('consultation', 'skills_assessment', 'eoi', 'state_nomination', 'visa_prep', 'doc_collection', 'gov_forms')
ON CONFLICT DO NOTHING;

-- Subclass 820 partner
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT '820', id, true, sort_order FROM public.service_catalog
WHERE code IN ('consultation', 'visa_prep', 'doc_collection', 'gov_forms', 'stat_dec', 'dibp_liaison')
ON CONFLICT DO NOTHING;

-- Subclass 482
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT '482', id, true, sort_order FROM public.service_catalog
WHERE code IN ('consultation', 'employer_sponsorship', 'visa_prep', 'doc_collection', 'gov_forms', 'health_character')
ON CONFLICT DO NOTHING;

-- Subclass 143 parent
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT '143', id, true, sort_order FROM public.service_catalog
WHERE code IN ('consultation', 'visa_prep', 'doc_collection', 'gov_forms', 'health_character', 'dibp_liaison')
ON CONFLICT DO NOTHING;

-- AAT / appeal matters
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT 'aat', id, true, sort_order FROM public.service_catalog
WHERE code IN ('consultation', 'aat_appeal', 'doc_collection', 'stat_dec', 'dibp_liaison')
ON CONFLICT DO NOTHING;

-- Default fallback (all common services pre-selected lightly)
INSERT INTO public.visa_service_templates (visa_subclass_key, service_catalog_id, default_selected, sort_order)
SELECT 'default', id, code IN ('consultation', 'visa_prep', 'doc_collection', 'gov_forms'), sort_order
FROM public.service_catalog
ON CONFLICT DO NOTHING;

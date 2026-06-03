-- Phase 8.5: logo bucket, branding numbering, matter type fields, clause keys

INSERT INTO storage.buckets (id, name, public)
VALUES ('agency_logos', 'agency_logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "agency_logos_public_read" ON storage.objects;
CREATE POLICY "agency_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency_logos');

DROP POLICY IF EXISTS "agency_logos_auth_insert" ON storage.objects;
CREATE POLICY "agency_logos_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agency_logos');

DROP POLICY IF EXISTS "agency_logos_auth_update" ON storage.objects;
CREATE POLICY "agency_logos_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'agency_logos');

DROP POLICY IF EXISTS "agency_logos_auth_delete" ON storage.objects;
CREATE POLICY "agency_logos_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agency_logos');

ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS agreement_ref_prefix TEXT DEFAULT 'AGR',
  ADD COLUMN IF NOT EXISTS agreement_ref_start INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS agreement_header_title TEXT DEFAULT 'Migration Agent Service Agreement',
  ADD COLUMN IF NOT EXISTS agreement_footer_text TEXT DEFAULT 'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.';

ALTER TABLE public.matter_types
  ADD COLUMN IF NOT EXISTS subclass_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS show_secondary_applicant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_sponsor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_dependants BOOLEAN DEFAULT false;

ALTER TABLE public.agreement_clauses
  ADD COLUMN IF NOT EXISTS clause_key TEXT,
  ADD COLUMN IF NOT EXISTS is_enabled_by_default BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.matter_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_type_id UUID NOT NULL REFERENCES public.matter_types(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  col_span INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (matter_type_id, field_key)
);

ALTER TABLE public.matter_type_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_matter_type_fields_select" ON public.matter_type_fields;
CREATE POLICY "tenant_matter_type_fields_select"
  ON public.matter_type_fields FOR SELECT TO authenticated
  USING (matter_type_id IN (SELECT id FROM public.matter_types WHERE agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())));

DROP POLICY IF EXISTS "tenant_matter_type_fields_insert" ON public.matter_type_fields;
CREATE POLICY "tenant_matter_type_fields_insert"
  ON public.matter_type_fields FOR INSERT TO authenticated
  WITH CHECK (matter_type_id IN (SELECT id FROM public.matter_types WHERE agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())));

DROP POLICY IF EXISTS "tenant_matter_type_fields_update" ON public.matter_type_fields;
CREATE POLICY "tenant_matter_type_fields_update"
  ON public.matter_type_fields FOR UPDATE TO authenticated
  USING (matter_type_id IN (SELECT id FROM public.matter_types WHERE agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())));

DROP POLICY IF EXISTS "tenant_matter_type_fields_delete" ON public.matter_type_fields;
CREATE POLICY "tenant_matter_type_fields_delete"
  ON public.matter_type_fields FOR DELETE TO authenticated
  USING (matter_type_id IN (SELECT id FROM public.matter_types WHERE agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())));

DROP TRIGGER IF EXISTS update_matter_type_fields_updated_at ON public.matter_type_fields;
CREATE TRIGGER update_matter_type_fields_updated_at
  BEFORE UPDATE ON public.matter_type_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

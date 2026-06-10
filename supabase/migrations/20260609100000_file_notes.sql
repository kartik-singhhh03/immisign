-- File Notes: append-only compliance timeline per client (client-centric, no matters)

CREATE TABLE IF NOT EXISTS public.file_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_system_note BOOLEAN NOT NULL DEFAULT false,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT file_notes_note_type_check CHECK (
    note_type IN ('general', 'phone', 'email', 'attendance', 'system')
  )
);

CREATE INDEX IF NOT EXISTS idx_file_notes_client_recorded
  ON public.file_notes (agency_id, client_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_notes_reference
  ON public.file_notes (agency_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.file_notes ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT only (no UPDATE/DELETE for compliance)
CREATE POLICY file_notes_select_tenant
  ON public.file_notes FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY file_notes_insert_tenant
  ON public.file_notes FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND is_system_note = false
    AND created_by = auth.uid()
  );

-- Service agreement template: one canonical template per agency
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS is_service_agreement BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_agency_service_agreement
  ON public.templates (agency_id)
  WHERE is_service_agreement = true;

-- Backfill: mark first template per agency as service agreement if none flagged
UPDATE public.templates t
SET is_service_agreement = true
WHERE t.is_service_agreement = false
  AND NOT EXISTS (
    SELECT 1 FROM public.templates x
    WHERE x.agency_id = t.agency_id AND x.is_service_agreement = true
  )
  AND t.id = (
    SELECT t2.id FROM public.templates t2
    WHERE t2.agency_id = t.agency_id
    ORDER BY t2.created_at ASC NULLS LAST
    LIMIT 1
  );

-- Seed service agreement template for agencies with none
INSERT INTO public.templates (agency_id, name, content, is_service_agreement)
SELECT a.id, 'OMARA Service Agreement', '{"html":""}'::jsonb, true
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates t
  WHERE t.agency_id = a.id AND t.is_service_agreement = true
);

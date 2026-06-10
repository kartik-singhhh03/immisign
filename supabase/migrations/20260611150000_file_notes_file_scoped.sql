-- File Notes: file-scoped notes + note type catalog (append-only preserved)

CREATE TABLE IF NOT EXISTS public.note_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  badge_text_color TEXT NOT NULL,
  badge_bg_color TEXT NOT NULL,
  dot_color TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.note_types (code, label, icon_name, badge_text_color, badge_bg_color, dot_color, is_manual, sort_order)
VALUES
  ('phone', 'Phone Call', 'Phone', '#be185d', '#fce7f3', '#3b82f6', true, 10),
  ('email', 'Email', 'Mail', '#1d4ed8', '#dbeafe', '#d97706', true, 20),
  ('attendance', 'Attendance', 'Calendar', '#6d28d9', '#ede9fe', '#8b5cf6', true, 30),
  ('advice', 'Advice', 'Lightbulb', '#15803d', '#dcfce7', '#10b981', true, 40),
  ('internal', 'Internal', 'Lock', '#475569', '#f1f5f9', '#94a3b8', true, 50),
  ('system', 'System', 'Sparkles', '#0f766e', '#ccfbf1', '#14b8a6', false, 60)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  icon_name = EXCLUDED.icon_name,
  badge_text_color = EXCLUDED.badge_text_color,
  badge_bg_color = EXCLUDED.badge_bg_color,
  dot_color = EXCLUDED.dot_color,
  is_manual = EXCLUDED.is_manual,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.note_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_types_select_all
  ON public.note_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY note_types_select_anon
  ON public.note_types FOR SELECT TO anon
  USING (true);

-- File scope columns (agreement or application_approval)
ALTER TABLE public.file_notes
  ADD COLUMN IF NOT EXISTS file_source TEXT,
  ADD COLUMN IF NOT EXISTS file_id UUID;

ALTER TABLE public.file_notes DROP CONSTRAINT IF EXISTS file_notes_file_source_check;
ALTER TABLE public.file_notes
  ADD CONSTRAINT file_notes_file_source_check CHECK (
    file_source IS NULL OR file_source IN ('agreement', 'application_approval')
  );

-- Backfill requires briefly lifting append-only guards (metadata only)
ALTER TABLE public.file_notes DISABLE TRIGGER file_notes_no_update;
ALTER TABLE public.file_notes DISABLE TRIGGER file_notes_no_delete;

-- Backfill from legacy reference fields
UPDATE public.file_notes
SET
  file_source = reference_type,
  file_id = reference_id
WHERE file_id IS NULL
  AND reference_type IN ('agreement', 'application_approval')
  AND reference_id IS NOT NULL;

-- Backfill remaining notes to latest agreement per client
UPDATE public.file_notes fn
SET
  file_source = 'agreement',
  file_id = sub.id
FROM (
  SELECT DISTINCT ON (a.client_id, a.agency_id)
    a.id,
    a.client_id,
    a.agency_id
  FROM public.agreements a
  ORDER BY a.client_id, a.agency_id, a.created_at DESC
) sub
WHERE fn.file_id IS NULL
  AND fn.client_id = sub.client_id
  AND fn.agency_id = sub.agency_id;

ALTER TABLE public.file_notes ENABLE TRIGGER file_notes_no_update;
ALTER TABLE public.file_notes ENABLE TRIGGER file_notes_no_delete;

-- Note type FK to catalog
ALTER TABLE public.file_notes DROP CONSTRAINT IF EXISTS file_notes_note_type_check;
ALTER TABLE public.file_notes DROP CONSTRAINT IF EXISTS file_notes_note_type_fk;
ALTER TABLE public.file_notes
  ADD CONSTRAINT file_notes_note_type_fk
  FOREIGN KEY (note_type) REFERENCES public.note_types(code);

CREATE INDEX IF NOT EXISTS idx_file_notes_file_scope
  ON public.file_notes (agency_id, client_id, file_source, file_id, recorded_at DESC)
  WHERE file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agreements_client_active
  ON public.agreements (agency_id, client_id, created_at DESC)
  WHERE status IS DISTINCT FROM 'cancelled';

CREATE INDEX IF NOT EXISTS idx_application_approvals_client_active
  ON public.application_approvals (agency_id, client_id, created_at DESC)
  WHERE deleted_at IS NULL AND status IS DISTINCT FROM 'closed';

-- Require file scope on new manual notes
CREATE OR REPLACE FUNCTION public.file_notes_require_file_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_system_note = false AND (NEW.file_source IS NULL OR NEW.file_id IS NULL) THEN
    RAISE EXCEPTION 'file_notes require file_source and file_id for manual notes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_notes_require_file_scope ON public.file_notes;
CREATE TRIGGER file_notes_require_file_scope
  BEFORE INSERT ON public.file_notes
  FOR EACH ROW EXECUTE FUNCTION public.file_notes_require_file_scope();

-- Auto-map reference fields to file scope for system notes
CREATE OR REPLACE FUNCTION public.file_notes_sync_file_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_source IS NULL AND NEW.reference_type IN ('agreement', 'application_approval') THEN
    NEW.file_source := NEW.reference_type;
    NEW.file_id := NEW.reference_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_notes_sync_file_scope ON public.file_notes;
CREATE TRIGGER file_notes_sync_file_scope
  BEFORE INSERT ON public.file_notes
  FOR EACH ROW EXECUTE FUNCTION public.file_notes_sync_file_scope();

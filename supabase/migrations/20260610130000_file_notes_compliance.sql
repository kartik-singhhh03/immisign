-- File Notes compliance hardening: note types, append-only triggers, client file number

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_number TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_client_number
  ON public.clients (agency_id, client_number)
  WHERE client_number IS NOT NULL;

-- Migrate legacy note types
UPDATE public.file_notes SET note_type = 'advice' WHERE note_type = 'general';

ALTER TABLE public.file_notes DROP CONSTRAINT IF EXISTS file_notes_note_type_check;
ALTER TABLE public.file_notes
  ADD CONSTRAINT file_notes_note_type_check CHECK (
    note_type IN ('phone', 'email', 'attendance', 'advice', 'internal', 'system')
  );

-- Append-only enforcement at DB level
CREATE OR REPLACE FUNCTION public.prevent_file_notes_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'file_notes are append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_notes_no_update ON public.file_notes;
CREATE TRIGGER file_notes_no_update
  BEFORE UPDATE ON public.file_notes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_file_notes_mutation();

DROP TRIGGER IF EXISTS file_notes_no_delete ON public.file_notes;
CREATE TRIGGER file_notes_no_delete
  BEFORE DELETE ON public.file_notes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_file_notes_mutation();

-- Manual notes always use server timestamp
CREATE OR REPLACE FUNCTION public.file_notes_force_server_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_system_note = false THEN
    NEW.recorded_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_notes_server_timestamp ON public.file_notes;
CREATE TRIGGER file_notes_server_timestamp
  BEFORE INSERT ON public.file_notes
  FOR EACH ROW EXECUTE FUNCTION public.file_notes_force_server_timestamp();

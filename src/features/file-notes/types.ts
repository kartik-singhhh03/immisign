export type ClientFileSource = 'agreement' | 'application_approval';

export type NoteTypeRecord = {
  code: string;
  label: string;
  icon_name: string;
  badge_text_color: string;
  badge_bg_color: string;
  dot_color: string;
  is_manual: boolean;
  sort_order: number;
};

export type FileNoteType = string;

export type FileNote = {
  id: string;
  agency_id: string;
  client_id: string;
  file_source: ClientFileSource | null;
  file_id: string | null;
  created_by: string | null;
  note_type: FileNoteType;
  body: string;
  recorded_at: string;
  is_system_note: boolean;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  author_name?: string | null;
};

export type FileNotesListResult = {
  notes: FileNote[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
};

export type RecordSystemNoteInput = {
  agencyId: string;
  clientId: string;
  body: string;
  noteType?: 'system';
  fileSource?: ClientFileSource;
  fileId?: string;
  referenceType?: string;
  referenceId?: string;
  recordedAt?: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
};

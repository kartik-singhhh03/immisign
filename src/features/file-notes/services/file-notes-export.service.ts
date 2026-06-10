import { formatExactTimestamp, formatNoteTypeLabel } from '../lib/format';
import type { FileNote, NoteTypeRecord } from '../types';

export function buildFileNotesExportTxt(params: {
  agencyName: string;
  clientName: string;
  fileNumber: string;
  visaSubclass?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  notes: FileNote[];
  noteTypes: NoteTypeRecord[];
  exportedBy: string;
  exportedAt: string;
}): string {
  const sorted = [...params.notes].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  const lines: string[] = [
    'FILE NOTES — AUDIT EXPORT',
    '=======================',
    `Agency: ${params.agencyName}`,
    `Client: ${params.clientName}`,
    `Matter Reference: ${params.fileNumber}`,
  ];

  if (params.visaSubclass) lines.push(`Visa Subclass: ${params.visaSubclass}`);
  if (params.clientEmail) lines.push(`Email: ${params.clientEmail}`);
  if (params.clientPhone) lines.push(`Phone: ${params.clientPhone}`);
  lines.push(
    `Exported: ${formatExactTimestamp(params.exportedAt)}`,
    `Exported by: ${params.exportedBy}`,
    `Total Notes: ${params.notes.length}`,
    '',
    '--- NOTES (chronological) ---',
    '',
  );

  for (const note of sorted) {
    const typeLabel = formatNoteTypeLabel(note.note_type, note.is_system_note, params.noteTypes);
    const agent = note.is_system_note ? 'Recorded automatically' : note.author_name || 'Agent';
    lines.push(
      `[${formatExactTimestamp(note.recorded_at)}] ${typeLabel} — ${agent}`,
      note.body,
      '',
    );
  }

  lines.push('--- END OF EXPORT ---');
  lines.push('Append-only compliance record. Suitable for OMARA audit purposes.');

  return lines.join('\n');
}

/** Developer Brief document naming standards */

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

function formatExportDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** SoS_{MatterRef}_{ClientLastName}_{Date}.pdf */
export function formatSosPdfFilename(
  matterRef: string,
  clientLastName: string,
  date: Date = new Date(),
): string {
  const ref = sanitizeSegment(matterRef || 'UNKNOWN');
  const last = sanitizeSegment(clientLastName || 'Client');
  const stamp = formatExportDate(date);
  return `SoS_${ref}_${last}_${stamp}.pdf`;
}

/** FileNotes_{MatterRef}_{ExportDate}.txt */
export function formatFileNotesExportFilename(
  matterRef: string,
  exportDate: Date = new Date(),
): string {
  const ref = sanitizeSegment(matterRef || 'UNKNOWN');
  const stamp = formatExportDate(exportDate);
  return `FileNotes_${ref}_${stamp}.txt`;
}

export function extractClientLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Client';
}

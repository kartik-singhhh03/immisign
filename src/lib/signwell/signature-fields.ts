import type { SignWellField } from './types';

export type SignwellFieldRecipient = {
  id: string;
  name: string;
  email: string;
};

/**
 * Default signature + date fields on the last page of the primary document.
 * SignWell does not need the migration agent as a recipient — agent signs via attestation PDF in-app.
 */
/** A4 page height in px (SignWell field coordinates are top-left origin). */
const DEFAULT_PAGE_HEIGHT = 792;
/** Align with client signature block on agreement signature page (bottom of page). */
const CLIENT_SIGNATURE_Y = 620;

export function buildDocumentSignatureFields(
  recipients: SignwellFieldRecipient[],
  options?: { lastPage?: number; pageHeight?: number },
): SignWellField[][] {
  const page = Math.max(1, options?.lastPage ?? 1);
  const pageHeight = options?.pageHeight ?? DEFAULT_PAGE_HEIGHT;
  const fields: SignWellField[] = [];

  recipients.forEach((recipient, idx) => {
    const yBase = CLIENT_SIGNATURE_Y - idx * 72;
    const y = Math.max(80, Math.min(yBase, pageHeight - 60));
    fields.push({
      api_id: `signature_${recipient.id}`,
      type: 'signature',
      recipient_id: recipient.id,
      page,
      x: 72,
      y,
      width: 220,
      height: 40,
      required: true,
    });
    fields.push({
      api_id: `date_${recipient.id}`,
      type: 'date',
      recipient_id: recipient.id,
      page,
      x: 310,
      y: y + 4,
      width: 130,
      height: 32,
      required: true,
    });
  });

  return [fields];
}

/** One field group per file; attestation PDF has no SignWell fields (agent already signed). */
export function buildMultiFileSignatureFields(
  recipients: SignwellFieldRecipient[],
  fileCount: number,
  options?: { lastPage?: number },
): SignWellField[][] {
  const primary = buildDocumentSignatureFields(recipients, options)[0] || [];
  const groups: SignWellField[][] = [primary];
  for (let i = 1; i < fileCount; i++) {
    groups.push([]);
  }
  return groups;
}

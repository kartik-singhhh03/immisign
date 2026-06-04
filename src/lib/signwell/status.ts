/** SignWell document statuses — @see Update and Send Document API */

export type SignwellParty = {
  id?: string;
  name?: string;
  email?: string;
  status?: string;
  signing_url?: string;
  send_email?: boolean;
};

export type SignwellDocLike = {
  status?: string;
  signers?: SignwellParty[];
  /** SignWell API returns `recipients` on create/get/send — not always `signers`. */
  recipients?: SignwellParty[];
};

/** Normalize API shape: treat recipients as signers for downstream checks. */
export function normalizeSignwellDocument<T extends SignwellDocLike>(doc: T): T & { signers: SignwellParty[] } {
  const parties =
    (doc.signers?.length ? doc.signers : null) ||
    (doc.recipients?.length ? doc.recipients : null) ||
    [];
  return {
    ...doc,
    signers: parties,
    recipients: doc.recipients?.length ? doc.recipients : parties,
  };
}

export function isSignwellDraftStatus(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'draft';
}

export function isSignwellDispatchedStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  if (!s) return false;
  if (isSignwellDraftStatus(s)) return false;
  if (s === 'created') return false;
  if (s === 'canceled' || s === 'cancelled') return false;
  return ['sent', 'pending', 'completed', 'viewed', 'action required', 'sending'].includes(s);
}

/** Document exists but POST /documents/{id}/send is still required. */
export function needsSignwellSendCall(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s === 'draft' || s === 'created' || s === 'sending';
}

export function signwellDispatchConfirmed(doc: SignwellDocLike): boolean {
  const normalized = normalizeSignwellDocument(doc);
  if (isSignwellDispatchedStatus(normalized.status)) return true;
  const parties = normalized.signers;
  if (parties.some((s) => s.signing_url)) return true;
  return parties.some((s) =>
    ['sent', 'pending', 'completed', 'viewed'].includes(String(s.status || '').toLowerCase()),
  );
}

export function formatSignwellDispatchFailure(doc: SignwellDocLike, documentId: string): string {
  const normalized = normalizeSignwellDocument(doc);
  const parties = normalized.signers
    .map((p) => `${p.email || '?'}:${p.status || 'unknown'}`)
    .join(', ');
  return (
    `SignWell document ${documentId} remained in status "${normalized.status || 'unknown'}" after send` +
    (parties ? ` (recipients: ${parties})` : '') +
    ' — emails were not dispatched.'
  );
}

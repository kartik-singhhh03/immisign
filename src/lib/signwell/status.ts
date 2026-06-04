/** SignWell document statuses — @see Update and Send Document API */

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

export function signwellDispatchConfirmed(doc: {
  status?: string;
  signers?: Array<{ status?: string; signing_url?: string }>;
}): boolean {
  if (isSignwellDispatchedStatus(doc.status)) return true;
  const signers = doc.signers || [];
  if (signers.some((s) => s.signing_url)) return true;
  return signers.some((s) =>
    ['sent', 'pending', 'completed', 'viewed'].includes(String(s.status || '').toLowerCase()),
  );
}

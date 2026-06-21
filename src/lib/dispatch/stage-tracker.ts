export type DispatchStageStatus = 'pending' | 'running' | 'success' | 'failed';

export type DispatchStageRecord = {
  id: string;
  label: string;
  status: DispatchStageStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
};

export class DispatchStageTracker {
  private readonly map = new Map<string, DispatchStageRecord>();
  private order: string[] = [];

  constructor(definitions: Array<{ id: string; label: string }>) {
    for (const d of definitions) {
      this.order.push(d.id);
      this.map.set(d.id, { id: d.id, label: d.label, status: 'pending' });
    }
  }

  start(id: string) {
    const row = this.map.get(id);
    if (!row) return;
    row.status = 'running';
    row.startedAt = new Date().toISOString();
    row.error = undefined;
  }

  complete(id: string) {
    const row = this.map.get(id);
    if (!row) return;
    const end = new Date();
    row.status = 'success';
    row.completedAt = end.toISOString();
    if (row.startedAt) {
      row.durationMs = end.getTime() - new Date(row.startedAt).getTime();
    }
  }

  fail(id: string, error: string) {
    const row = this.map.get(id);
    if (!row) return;
    const end = new Date();
    row.status = 'failed';
    row.completedAt = end.toISOString();
    row.error = error;
    if (row.startedAt) {
      row.durationMs = end.getTime() - new Date(row.startedAt).getTime();
    }
  }

  snapshot(): DispatchStageRecord[] {
    return this.order.map((id) => ({ ...this.map.get(id)! }));
  }

  failedStage(): DispatchStageRecord | undefined {
    return this.snapshot().find((s) => s.status === 'failed');
  }
}

/** Client: file upload to storage */
export const DOCUMENT_SEND_CLIENT_UPLOAD = {
  id: 'upload',
  label: 'Uploading file',
} as const;

/** Server-side dispatch (after document row exists) */
export const DOCUMENT_SEND_STAGES = [
  { id: 'document', label: 'Creating document' },
  { id: 'pdf', label: 'Generating PDF' },
  { id: 'storage', label: 'Uploading file' },
  { id: 'signwell_draft', label: 'Creating SignWell draft' },
  { id: 'email', label: 'Sending email' },
  { id: 'confirm', label: 'Waiting confirmation' },
  { id: 'records', label: 'Updating records' },
  { id: 'notification', label: 'Creating notification' },
] as const;

export const DOCUMENT_SEND_SUCCESS = {
  id: 'completed',
  label: 'Completed',
} as const;

export const AGREEMENT_SEND_STAGES = [
  { id: 'agreement', label: 'Generating Agreement' },
  { id: 'pdf', label: 'Creating PDF' },
  { id: 'storage', label: 'Uploading Storage' },
  { id: 'signwell_draft', label: 'Creating SignWell Draft' },
  { id: 'signwell_send', label: 'Sending Agreement' },
  { id: 'confirm', label: 'Waiting Confirmation' },
] as const;

/** Native ImmiSign portal dispatch (no SignWell). */
export const NATIVE_AGREEMENT_SEND_STAGES = [
  { id: 'agreement', label: 'Generating Agreement' },
  { id: 'pdf', label: 'Creating PDF' },
  { id: 'storage', label: 'Uploading Storage' },
  { id: 'native_send', label: 'Sending Signing Link' },
  { id: 'confirm', label: 'Waiting Confirmation' },
] as const;

/** SignWell must return signing links (or sent status) for email stage to pass in production. */
export function signwellEmailDispatched(
  sentDoc: { status?: string; signers?: Array<{ signing_url?: string; email?: string }> },
  testMode: boolean,
): { ok: boolean; reason?: string } {
  if (testMode) {
    return {
      ok: true,
      reason: 'SignWell test mode — emails are not delivered to real inboxes',
    };
  }
  const links = (sentDoc.signers || []).filter((s) => s.signing_url);
  if (links.length > 0) return { ok: true };
  const status = (sentDoc.status || '').toLowerCase();
  if (status === 'draft' || status === 'created') {
    return { ok: false, reason: `SignWell document still in "${status}" — send did not complete` };
  }
  const signerSent = (sentDoc.signers || []).some((s) =>
    ['sent', 'pending', 'completed', 'viewed'].includes(String(s.status || '').toLowerCase()),
  );
  if (
    ['sent', 'pending', 'completed', 'viewed', 'action required', 'sending'].includes(status) &&
    (signerSent || links.length > 0)
  ) {
    return { ok: true };
  }
  if (links.length > 0 && signerSent) return { ok: true };
  return { ok: false, reason: 'No signer signing URLs returned from SignWell' };
}

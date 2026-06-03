import { signwellClient, SignWellClient } from './client';
import type { SignWellDocumentRequest, SignWellDocumentResponse } from './types';

export function isSignwellDraftStatus(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'draft';
}

export function isSignwellDispatchedStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  if (!s) return false;
  if (isSignwellDraftStatus(s)) return false;
  if (s === 'canceled' || s === 'cancelled') return false;
  return true;
}

/**
 * Create a draft document and send it. Skips /send when SignWell already moved the doc out of draft
 * (fixes 422 "isn't draft" on retry or auto-send edge cases).
 */
export async function createAndSendSignwellDocument(
  payload: SignWellDocumentRequest,
  client: SignWellClient = signwellClient,
): Promise<SignWellDocumentResponse> {
  const created = await client.createDocument({
    ...payload,
    draft: true,
  });

  if (isSignwellDraftStatus(created.status)) {
    return client.sendDocument(created.id);
  }

  if (isSignwellDispatchedStatus(created.status)) {
    return created;
  }

  return client.sendDocument(created.id);
}

export async function resumeSignwellDocumentIfDraft(
  signwellDocumentId: string,
  client: SignWellClient = signwellClient,
): Promise<SignWellDocumentResponse> {
  const existing = await client.getDocument(signwellDocumentId);
  if (isSignwellDraftStatus(existing.status)) {
    return client.sendDocument(signwellDocumentId);
  }
  if (isSignwellDispatchedStatus(existing.status)) {
    return existing;
  }
  throw new Error(
    `SignWell document ${signwellDocumentId} is in status "${existing.status}" and cannot be sent.`,
  );
}

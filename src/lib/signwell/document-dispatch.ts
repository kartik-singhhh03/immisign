import { signwellClient, SignWellClient } from './client';
import type { SignWellDocumentRequest, SignWellDocumentResponse } from './types';

export function isSignwellDraftStatus(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'draft';
}

export function isSignwellDispatchedStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  if (!s) return false;
  if (isSignwellDraftStatus(s)) return false;
  if (s === 'created') return false;
  if (s === 'canceled' || s === 'cancelled') return false;
  return ['sent', 'pending', 'completed', 'viewed', 'action required'].includes(s);
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

  const sendBody = {
    subject: payload.subject,
    message: payload.message,
  };

  if (isSignwellDraftStatus(created.status)) {
    const sent = await client.sendDocument(created.id, sendBody);
    if (!isSignwellDispatchedStatus(sent.status)) {
      throw new Error(
        `SignWell document ${created.id} remained in status "${sent.status}" after send — emails were not dispatched.`,
      );
    }
    return sent;
  }

  if (isSignwellDispatchedStatus(created.status)) {
    return created;
  }

  const sent = await client.sendDocument(created.id, sendBody);
  if (!isSignwellDispatchedStatus(sent.status)) {
    throw new Error(
      `SignWell document ${created.id} remained in status "${sent.status}" after send — emails were not dispatched.`,
    );
  }
  return sent;
}

export async function resumeSignwellDocumentIfDraft(
  signwellDocumentId: string,
  client: SignWellClient = signwellClient,
): Promise<SignWellDocumentResponse> {
  const existing = await client.getDocument(signwellDocumentId);
  if (isSignwellDraftStatus(existing.status)) {
    const sent = await client.sendDocument(signwellDocumentId, {
      subject: 'Signature required',
      message: 'Please review and sign the attached document.',
    });
    if (!isSignwellDispatchedStatus(sent.status)) {
      throw new Error(`SignWell document ${signwellDocumentId} could not be sent (status: ${sent.status}).`);
    }
    return sent;
  }
  if (isSignwellDispatchedStatus(existing.status)) {
    return existing;
  }
  throw new Error(
    `SignWell document ${signwellDocumentId} is in status "${existing.status}" and cannot be sent.`,
  );
}

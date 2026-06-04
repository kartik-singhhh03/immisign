import { signwellClient, SignWellClient } from './client';
import type { SignWellDocumentRequest, SignWellDocumentResponse } from './types';
import {
  isSignwellDraftStatus,
  isSignwellDispatchedStatus,
  needsSignwellSendCall,
  signwellDispatchConfirmed,
} from './status';

export {
  isSignwellDraftStatus,
  isSignwellDispatchedStatus,
  needsSignwellSendCall,
  signwellDispatchConfirmed,
} from './status';

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

  if (signwellDispatchConfirmed(created)) {
    return created;
  }

  const sent = await client.sendDocument(created.id, sendBody);
  if (!signwellDispatchConfirmed(sent)) {
    throw new Error(
      `SignWell document ${created.id} remained in status "${sent.status}" after send — emails were not dispatched.`,
    );
  }
  return sent;
}

export async function resumeSignwellDocumentIfDraft(
  signwellDocumentId: string,
  sendBody?: { subject?: string; message?: string },
  client: SignWellClient = signwellClient,
): Promise<SignWellDocumentResponse> {
  const existing = await client.getDocument(signwellDocumentId);
  if (signwellDispatchConfirmed(existing)) {
    return existing;
  }
  if (!needsSignwellSendCall(existing.status)) {
    throw new Error(
      `SignWell document ${signwellDocumentId} is in status "${existing.status}" and cannot be sent.`,
    );
  }
  const sent = await client.sendDocument(signwellDocumentId, sendBody);
  if (!signwellDispatchConfirmed(sent)) {
    throw new Error(
      `SignWell document ${signwellDocumentId} could not be sent (status: ${sent.status}).`,
    );
  }
  return sent;
}

import { signwellClient, SignWellClient } from './client';
import type { SignWellDocumentRequest, SignWellDocumentResponse } from './types';
import {
  formatSignwellDispatchFailure,
  needsSignwellSendCall,
  signwellDispatchConfirmed,
} from './status';

export {
  isSignwellDraftStatus,
  isSignwellDispatchedStatus,
  needsSignwellSendCall,
  signwellDispatchConfirmed,
  normalizeSignwellDocument,
} from './status';

/**
 * Create then send via SignWell. Uses draft:true + POST /send, or draft:false when subject/message set.
 */
export async function createAndSendSignwellDocument(
  payload: SignWellDocumentRequest,
  client: SignWellClient = signwellClient,
): Promise<SignWellDocumentResponse> {
  const sendBody = {
    subject: payload.subject,
    message: payload.message,
  };

  const canSendOnCreate = Boolean(payload.subject?.trim() && payload.message?.trim());

  const created = await client.createDocument({
    ...payload,
    draft: canSendOnCreate ? false : true,
  });

  if (signwellDispatchConfirmed(created)) {
    return created;
  }

  if (!needsSignwellSendCall(created.status)) {
    throw new Error(formatSignwellDispatchFailure(created, created.id));
  }

  const sent = await client.sendDocument(created.id, sendBody);
  if (!signwellDispatchConfirmed(sent)) {
    throw new Error(formatSignwellDispatchFailure(sent, created.id));
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
    throw new Error(formatSignwellDispatchFailure(sent, signwellDocumentId));
  }
  return sent;
}

import type { SignWellDocumentRequest } from './types';

export type SignwellDispatchSource = {
  wizardForm?: Record<string, unknown> | null;
  dispatchOptions?: Record<string, unknown> | null;
  agreementTitle?: string;
  sender?: { name: string; email: string };
};

export type SignwellDispatchExtras = Pick<
  SignWellDocumentRequest,
  'subject' | 'message' | 'reminders' | 'copied_contacts' | 'custom_requester_email'
>;

type CopiedContact = { email: string; name?: string };

function pickBool(...values: unknown[]): boolean | undefined {
  for (const v of values) {
    if (typeof v === 'boolean') return v;
  }
  return undefined;
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Maps wizard / dispatch_options fields to SignWell API fields (not metadata-only).
 */
export function buildSignwellDispatchExtras(source: SignwellDispatchSource): SignwellDispatchExtras {
  const wizard = source.wizardForm || {};
  const dispatch = source.dispatchOptions || {};

  const message =
    pickString(dispatch.emailMessage, wizard.emailMessage) ||
    'Please review and sign the attached document.';

  const subject =
    pickString(dispatch.emailSubject, wizard.emailSubject) ||
    (source.agreementTitle
      ? `Signature required: ${source.agreementTitle}`
      : 'Signature required');

  const ccMe = pickBool(dispatch.ccMe, wizard.ccMe) ?? false;
  const autoRemind = pickBool(dispatch.autoRemind7Days, wizard.autoRemind7Days) ?? false;
  const emailOnComplete = pickBool(dispatch.emailOnComplete, wizard.emailOnComplete) ?? false;

  const sender = source.sender;
  const copied_contacts: CopiedContact[] = [];

  if (sender?.email && (ccMe || emailOnComplete)) {
    copied_contacts.push({
      email: sender.email.trim(),
      name: sender.name?.trim() || undefined,
    });
  }

  const extras: SignwellDispatchExtras = {
    subject,
    message,
    reminders: autoRemind,
  };

  if (sender?.email) {
    extras.custom_requester_email = sender.email.trim();
  }

  if (copied_contacts.length > 0) {
    extras.copied_contacts = copied_contacts;
  }

  return extras;
}

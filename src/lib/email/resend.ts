import { Resend } from 'resend';
import { recordEmailDelivery } from './delivery-audit';
import { APP_NAME } from '@/lib/brand';

const RESEND_KEY_PREFIX = 're_';
const TEST_FROM_FALLBACK = 'onboarding@resend.dev';

export type ResendSendPayload = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  tags?: Array<{ name: string; value: string }>;
};

/** Branded display name while keeping platform sender address for deliverability. */
export function formatBrandedSender(agentName: string, agencyName: string): string {
  const fromEmail = getResendFromEmail();
  const safeAgent = (agentName || 'Agent').replace(/"/g, "'");
  const safeAgency = (agencyName || APP_NAME).replace(/"/g, "'");
  return `${safeAgent} - ${safeAgency} <${fromEmail}>`;
}

function maskKey(key: string) {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error('RESEND_API_KEY is missing');
  }
  if (!key.startsWith(RESEND_KEY_PREFIX)) {
    throw new Error('RESEND_API_KEY is malformed');
  }
  return key;
}

export function getResendFromEmail(): string {
  return (process.env.RESEND_FROM_EMAIL?.trim() || TEST_FROM_FALLBACK).toLowerCase();
}

export function isLikelyProductionFromAddress(from: string): boolean {
  const normalized = from.toLowerCase();
  return (
    normalized.endsWith('@resend.dev') ||
    normalized.endsWith('@immimate.com') ||
    normalized.endsWith('@immimate.com.au') ||
    normalized.endsWith('@mail.immimate.com') ||
    normalized.endsWith('@immisign.com') ||
    normalized.endsWith('@immisign.com.au') ||
    normalized.endsWith('@mail.immisign.com') ||
    normalized.endsWith('@immimate.app') ||
    normalized.endsWith('@immimate.au') ||
    normalized.endsWith('@immimate.com')
  );
}

export function createResendClient(): Resend {
  const key = getResendApiKey();
  return new Resend(key);
}

export function getResendConfigSummary() {
  const key = process.env.RESEND_API_KEY?.trim() || '';
  const from = getResendFromEmail();
  return {
    resendConfigured: Boolean(key),
    apiKeyPresent: Boolean(key),
    apiKeyMasked: key ? maskKey(key) : null,
    senderConfigured: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    sender: from,
    senderLooksValid: isLikelyProductionFromAddress(from),
    environment: process.env.NODE_ENV || 'unknown',
  };
}

export async function sendEmailWithForensicLogging(
  payload: ResendSendPayload,
  auditMeta?: { emailType?: string; agencyId?: string | null },
) {
  const resend = createResendClient();
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const primaryRecipient = recipients[0] || '';

  console.log('EMAIL_SEND_START', JSON.stringify({
    to: payload.to,
    subject: payload.subject,
    from: payload.from,
  }));

  try {
    const result = await resend.emails.send(payload);
    console.log('EMAIL_SEND_SUCCESS', JSON.stringify(result, null, 2));
    if (result && typeof result === 'object' && 'error' in result && (result as { error?: { message?: string } }).error) {
      const resendError = (result as { error?: { message?: string } }).error;
      await recordEmailDelivery({
        recipient: primaryRecipient,
        subject: payload.subject,
        status: 'failed',
        emailType: auditMeta?.emailType,
        agencyId: auditMeta?.agencyId,
        error: resendError?.message || 'Resend returned error payload',
      });
      throw new Error(resendError?.message || 'Resend returned error payload');
    }

    const resendId = (result as { data?: { id?: string } })?.data?.id ?? null;
    await recordEmailDelivery({
      recipient: primaryRecipient,
      subject: payload.subject,
      resendId,
      status: resendId ? 'accepted' : 'sent',
      emailType: auditMeta?.emailType,
      agencyId: auditMeta?.agencyId,
    });

    return result;
  } catch (error) {
    console.error('EMAIL_SEND_FAILED', JSON.stringify(error, null, 2));
    const message = error instanceof Error ? error.message : 'Email send failed';
    await recordEmailDelivery({
      recipient: primaryRecipient,
      subject: payload.subject,
      status: 'failed',
      emailType: auditMeta?.emailType,
      agencyId: auditMeta?.agencyId,
      error: message,
    });
    throw error;
  }
}

import { Resend } from 'resend';

const RESEND_KEY_PREFIX = 're_';
const TEST_FROM_FALLBACK = 'onboarding@resend.dev';

export type ResendSendPayload = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
};

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
    normalized.endsWith('@immisign.com') ||
    normalized.endsWith('@immisign.com.au') ||
    normalized.endsWith('@mail.immisign.com')
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

export async function sendEmailWithForensicLogging(payload: ResendSendPayload) {
  const resend = createResendClient();
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
      throw new Error(resendError?.message || 'Resend returned error payload');
    }
    return result;
  } catch (error) {
    console.error('EMAIL_SEND_FAILED', JSON.stringify(error, null, 2));
    throw error;
  }
}

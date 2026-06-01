import crypto from 'crypto';
import { signwellConfig } from './config';
import { WebhookEventPayload } from './types';
import { AppError } from '../utils/errors';

export function verifyWebhookSignature(payloadBody: string, signatureHeader: string | null): boolean {
  if (process.env.SKIP_WEBHOOK_VALIDATION === 'true') {
    console.log("Bypassing webhook signature validation due to SKIP_WEBHOOK_VALIDATION=true");
    return true;
  }

  if (!signwellConfig.webhookSecret) {
    console.warn("SignWell Webhook Secret not configured. Bypassing validation (NOT FOR PRODUCTION).");
    return true; // Optionally fail here securely
  }
  
  if (!signatureHeader) return false;

  const hash = crypto
    .createHmac('sha256', signwellConfig.webhookSecret)
    .update(payloadBody, 'utf8')
    .digest('base64');

  return hash === signatureHeader;
}

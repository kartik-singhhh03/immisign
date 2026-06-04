import crypto from 'crypto';
import { signwellConfig } from './config';

export type SignwellWebhookEventMeta = {
  type: string;
  time: number;
  hash: string;
  related_signer?: { email?: string; name?: string };
};

export type ParsedSignwellWebhook = {
  event: SignwellWebhookEventMeta;
  documentId: string;
  /** Stable idempotency key (SignWell event.hash). */
  idempotencyKey: string;
  raw: Record<string, unknown>;
};

const HOOK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * HMAC key for event.hash verification.
 * SignWell uses the webhook subscription `id` from POST/GET /api/v1/hooks (Ruby SDK: webhook_id).
 * Workspace Callback URL in the dashboard registers the same subscription; the id is not shown in UI.
 * @see https://developers.signwell.com/reference/event-data
 * @see https://developers.signwell.com/reference/listwebhooks
 */
export function getSignwellWebhookVerificationKey(): string | null {
  const explicit = process.env.SIGNWELL_WEBHOOK_ID?.trim();
  if (explicit) return explicit;

  // Back-compat: some env files used SIGNWELL_WEBHOOK_SECRET for the hook id when it is a UUID.
  const legacy = process.env.SIGNWELL_WEBHOOK_SECRET?.trim();
  if (legacy && HOOK_ID_RE.test(legacy)) return legacy;

  return null;
}

/**
 * SignWell: HMAC-SHA256 hex digest of `${type}@${time}` with webhook subscription id as key.
 * Compared to event.hash in the JSON body (not an HTTP header).
 */
export function verifySignwellEventHash(event: SignwellWebhookEventMeta): boolean {
  const webhookId = getSignwellWebhookVerificationKey();
  if (!webhookId) {
    console.error(
      '[signwell-webhook] Missing verification key. Set SIGNWELL_WEBHOOK_ID to the `id` from GET /api/v1/hooks for your callback URL (run: node scripts/list-signwell-hooks.mjs).',
    );
    return false;
  }

  if (!event.type || event.time == null || !event.hash) {
    return false;
  }

  const data = `${event.type}@${event.time}`;
  const calculated = crypto.createHmac('sha256', webhookId).update(data, 'utf8').digest('hex');
  return secureCompare(calculated, event.hash);
}

/**
 * Undocumented in SignWell API reference; kept for older integrations that sent x-signwell-signature.
 * Official verification is event.hash only (see SignWell Ruby SDK Webhook module).
 */
export function verifyWebhookSignatureLegacy(
  payloadBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = signwellConfig.webhookSecret?.trim();
  if (!secret || HOOK_ID_RE.test(secret) || !signatureHeader) return false;
  const hash = crypto.createHmac('sha256', secret).update(payloadBody, 'utf8').digest('base64');
  return hash === signatureHeader;
}

export function parseSignwellWebhookPayload(body: unknown): ParsedSignwellWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const payload = body as Record<string, unknown>;
  const eventRaw = payload.event;
  if (!eventRaw || typeof eventRaw !== 'object') return null;

  const eventObj = eventRaw as Record<string, unknown>;
  const type = String(eventObj.type || '');
  const time = Number(eventObj.time);
  const hash = String(eventObj.hash || '');
  if (!type || !Number.isFinite(time) || !hash) return null;

  const data = payload.data as Record<string, unknown> | undefined;
  const object = data?.object as Record<string, unknown> | undefined;
  const documentId = String(object?.id || (data as { id?: string })?.id || '');
  if (!documentId) return null;

  const related = eventObj.related_signer as { email?: string; name?: string } | undefined;

  return {
    event: { type, time, hash, related_signer: related },
    documentId,
    idempotencyKey: hash,
    raw: payload,
  };
}

export function verifyWebhookPayload(
  body: unknown,
  options?: { rawBody?: string; signatureHeader?: string | null },
): { ok: boolean; parsed: ParsedSignwellWebhook | null; method?: string } {
  const parsed = parseSignwellWebhookPayload(body);
  if (!parsed) {
    return { ok: false, parsed: null };
  }

  if (process.env.SKIP_WEBHOOK_VALIDATION === 'true') {
    console.warn('[signwell-webhook] SKIP_WEBHOOK_VALIDATION=true — signature not verified');
    return { ok: true, parsed, method: 'skip' };
  }

  if (verifySignwellEventHash(parsed.event)) {
    return { ok: true, parsed, method: 'event.hash' };
  }

  if (
    options?.rawBody &&
    verifyWebhookSignatureLegacy(options.rawBody, options.signatureHeader ?? null)
  ) {
    console.warn('[signwell-webhook] Accepted via legacy x-signwell-signature (not in SignWell API docs)');
    return { ok: true, parsed, method: 'legacy-header' };
  }

  return { ok: false, parsed };
}

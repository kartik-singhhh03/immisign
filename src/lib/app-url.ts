import { isProductionBuild, isVercel, resolveAppUrl } from '@/lib/env';

/** Last-resort production origin when env vars are missing or unsafe. */
export const DEFAULT_PRODUCTION_APP_ORIGIN = 'https://immisign.vercel.app';

const UNSAFE_EMAIL_HOST = /localhost|127\.0\.0\.1|ngrok/i;

/** True when a URL must not appear in outbound email (production safety). */
export function isUnsafeEmailUrl(url: string): boolean {
  try {
    return UNSAFE_EMAIL_HOST.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

function normalizePublicOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/$/, '');
  if (!trimmed) return null;

  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Production email/deep-link origin resolution:
 * 1. NEXT_PUBLIC_APP_URL (when set and safe)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain)
 * 3. DEFAULT_PRODUCTION_APP_ORIGIN (https://immisign.vercel.app)
 */
function resolveProductionEmailOrigin(): string {
  const explicit = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit && !isUnsafeEmailUrl(explicit)) return explicit;

  const vercelProduction = normalizePublicOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction && !isUnsafeEmailUrl(vercelProduction)) return vercelProduction;

  return DEFAULT_PRODUCTION_APP_ORIGIN;
}

/**
 * Resolves the public app URL for emails and deep links.
 * - Production: NEXT_PUBLIC_APP_URL → VERCEL_PROJECT_PRODUCTION_URL → immisign.vercel.app
 * - Preview: https://{VERCEL_URL}
 * - Local dev: NEXT_PUBLIC_APP_URL or http://localhost:{PORT}
 */
export function resolveAppUrlForEmail(): string {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === 'production') {
    return resolveProductionEmailOrigin();
  }

  if (vercelEnv === 'preview') {
    const preview = normalizePublicOrigin(process.env.VERCEL_URL);
    if (preview) return preview;
  }

  if (isVercel() && process.env.VERCEL_URL?.trim()) {
    const vercelHost = normalizePublicOrigin(process.env.VERCEL_URL);
    if (vercelHost) return vercelHost;
  }

  const explicit = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) return explicit;

  const devPort = process.env.PORT?.trim() || '3000';
  return resolveAppUrl(false) || `http://localhost:${devPort}`;
}

/** Canonical app URL for redirects, emails, and Stripe callbacks. */
export function getAppUrl(): string {
  return resolveAppUrl(true)!;
}

/** Client approval portal link for emails. */
export function buildApprovalUrl(token: string): string {
  const base = resolveAppUrlForEmail().replace(/\/$/, '');
  return `${base}/approval/${token}`;
}

/** Native agreement signing portal link for emails. */
export function buildAgreementSignUrl(token: string): string {
  const base = resolveAppUrlForEmail().replace(/\/$/, '');
  return `${base}/agreement/sign/${token}`;
}

/** Throws when a production email would contain localhost, loopback, or ngrok. */
export function assertSafeEmailUrl(url: string, context = 'email link'): void {
  if (isProductionBuild() && isUnsafeEmailUrl(url)) {
    throw new Error(
      `Unsafe ${context}: ${url}. Set NEXT_PUBLIC_APP_URL to your live production domain.`,
    );
  }
}

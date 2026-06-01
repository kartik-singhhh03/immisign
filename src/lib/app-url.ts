/**
 * Canonical app URL for redirects, emails, and Stripe callbacks.
 * In production, NEXT_PUBLIC_APP_URL must be set (e.g. https://app.immisign.com).
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (url) return url;

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (isProduction) {
    throw new Error('NEXT_PUBLIC_APP_URL is required in production');
  }

  return 'http://localhost:3000';
}

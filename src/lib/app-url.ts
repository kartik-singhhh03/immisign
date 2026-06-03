import { resolveAppUrl } from '@/lib/env';

/** Canonical app URL for redirects, emails, and Stripe callbacks. */
export function getAppUrl(): string {
  return resolveAppUrl(true)!
}

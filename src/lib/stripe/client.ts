import Stripe from 'stripe';
import { getRequiredEnv } from '@/lib/env';
import { resolveAppUrl } from '@/lib/env';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia' as any,
    appInfo: {
      name: 'ImmiSign SaaS',
      version: '1.0.0',
      url: resolveAppUrl(false) || 'http://localhost:3000',
    },
    typescript: true,
  });

  return stripeClient;
}

/** Lazy Stripe client — resolves credentials on first use. */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    const client = getStripe();
    const value = client[prop as keyof Stripe];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export function requireStripeSecretKey(): string {
  return getRequiredEnv('STRIPE_SECRET_KEY');
}

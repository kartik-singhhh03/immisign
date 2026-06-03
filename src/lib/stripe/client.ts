import Stripe from 'stripe';
import { getRequiredEnv, isProductionBuild } from '@/lib/env';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && isProductionBuild()) {
  throw new Error('STRIPE_SECRET_KEY is required in production');
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_not_configured', {
  apiVersion: '2026-04-22.dahlia' as any,
  appInfo: {
    name: 'ImmiSign SaaS',
    version: '1.0.0',
    url: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000',
  },
  typescript: true,
});

export function requireStripeSecretKey(): string {
  return getRequiredEnv('STRIPE_SECRET_KEY');
}

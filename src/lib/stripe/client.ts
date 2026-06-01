import Stripe from 'stripe';
import { isSafeDevMode } from '@/lib/config';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && !isSafeDevMode) {
  console.warn('STRIPE_SECRET_KEY missing. Billing features will fail.');
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder_for_local_build', {
  apiVersion: '2026-04-22.dahlia' as any,
  appInfo: {
    name: 'ImmiSign SaaS',
    version: '1.0.0',
    url: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000',
  },
  typescript: true,
});

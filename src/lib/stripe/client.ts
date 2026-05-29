import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY missing. Billing features will fail in production.');
}

// Instantiate Stripe strictly attached to the version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-04-10', // Latest stable
  appInfo: {
    name: 'ImmiSign SaaS',
    version: '1.0.0',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  typescript: true,
});

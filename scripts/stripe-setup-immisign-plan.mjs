#!/usr/bin/env node
/**
 * Creates ImmiSign base ($49) and seat ($10) products/prices in Stripe test mode.
 * Prints env vars to add to .env.local
 */
import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY?.trim();
if (!secret) {
  console.error('Set STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(secret);

async function main() {
  const baseProduct = await stripe.products.create({
    name: 'ImmiSign Plan',
    description:
      'One agency workspace, 3 included seats, unlimited agreements, approvals, signing, templates, branding, audit trail.',
  });

  const basePrice = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 4900,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'ImmiSign Base Monthly',
  });

  const seatProduct = await stripe.products.create({
    name: 'ImmiSign Additional Seat',
    description: 'Per active agent/RMA/admin/staff above 3 included seats.',
  });

  const seatPrice = await stripe.prices.create({
    product: seatProduct.id,
    unit_amount: 1000,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'ImmiSign Seat Monthly',
  });

  console.log('\nAdd to .env.local:\n');
  console.log(`STRIPE_IMMISIGN_BASE_PRICE_ID="${basePrice.id}"`);
  console.log(`STRIPE_IMMISIGN_SEAT_PRICE_ID="${seatPrice.id}"`);
  console.log('\nProducts:', baseProduct.id, seatProduct.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

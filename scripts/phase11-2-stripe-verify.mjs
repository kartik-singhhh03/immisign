#!/usr/bin/env node
/**
 * Read-only Stripe config verification (products/prices/webhook secret format).
 */
import fs from 'fs';
import Stripe from 'stripe';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv();
const secret = env.STRIPE_SECRET_KEY?.trim();
const baseId = env.STRIPE_IMMISIGN_BASE_PRICE_ID?.trim();
const seatId = env.STRIPE_IMMISIGN_SEAT_PRICE_ID?.trim();
const pub = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

const report = { checks: [], blockers: [] };

if (!secret) {
  report.blockers.push('STRIPE_SECRET_KEY missing');
} else {
  const mode = secret.startsWith('sk_live') ? 'live' : secret.startsWith('sk_test') ? 'test' : 'unknown';
  report.checks.push({ item: 'secret_key_mode', status: mode });
  if (pub?.startsWith('pk_test') && mode === 'live') {
    report.blockers.push('MISMATCH: live secret key with test publishable key');
  }
  if (pub?.startsWith('pk_live') && mode === 'test') {
    report.blockers.push('MISMATCH: test secret key with live publishable key');
  }
}

if (!baseId || !seatId) {
  report.blockers.push('STRIPE_IMMISIGN_BASE_PRICE_ID or SEAT price ID missing');
} else if (secret) {
  const stripe = new Stripe(secret);
  try {
    const base = await stripe.prices.retrieve(baseId, { expand: ['product'] });
    const seat = await stripe.prices.retrieve(seatId, { expand: ['product'] });
    report.checks.push({
      item: 'base_price',
      status: 'PASS',
      amount: base.unit_amount,
      currency: base.currency,
      interval: base.recurring?.interval,
      product: typeof base.product === 'object' ? base.product.name : base.product,
    });
    report.checks.push({
      item: 'seat_price',
      status: 'PASS',
      amount: seat.unit_amount,
      currency: seat.currency,
      interval: seat.recurring?.interval,
      product: typeof seat.product === 'object' ? seat.product.name : seat.product,
    });
    if (base.unit_amount !== 4900) report.blockers.push(`Base price is ${base.unit_amount} cents, expected 4900 (AUD $49)`);
    if (seat.unit_amount !== 1000) report.blockers.push(`Seat price is ${seat.unit_amount} cents, expected 1000 (AUD $10)`);
    if (base.currency !== 'aud' || seat.currency !== 'aud') {
      report.blockers.push('Prices should be AUD for ImmiSign plan');
    }
  } catch (e) {
    report.blockers.push(`Stripe API error: ${e.message}`);
  }
}

if (!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
  report.checks.push({ item: 'webhook_secret', status: 'WARNING', note: 'STRIPE_WEBHOOK_SECRET missing or placeholder' });
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.blockers.length ? 1 : 0);

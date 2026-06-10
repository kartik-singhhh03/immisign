import type Stripe from 'stripe';

/** Basil+ API may expose billing period on line items instead of the subscription root. */
export function resolveSubscriptionPeriod(sub: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const startTs =
    sub.current_period_start ??
    sub.items.data[0]?.current_period_start ??
    null;
  const endTs =
    sub.current_period_end ??
    sub.items.data[0]?.current_period_end ??
    null;

  return {
    start: startTs ? new Date(startTs * 1000).toISOString() : null,
    end: endTs ? new Date(endTs * 1000).toISOString() : null,
  };
}

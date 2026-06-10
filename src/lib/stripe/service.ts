import Stripe from 'stripe';
import { stripe } from './client';
import { getImmisignPlan } from './plan';
import {
  additionalSeatsFromBillableCount,
  countActiveBillableUsers,
} from './seats';
import { createAdminClient } from '../supabase/admin';
import { getAppUrl } from '@/lib/app-url';
import { resolveSubscriptionPeriod } from './subscription-period';

export class StripeService {
  async getOrCreateCustomer(
    agencyId: string,
    email: string,
    name: string,
  ): Promise<string> {
    const admin = createAdminClient();
    const { data: agency, error } = (await admin
      .from('agencies')
      .select('stripe_customer_id')
      .eq('id', agencyId)
      .single()) as { data: { stripe_customer_id?: string } | null; error: unknown };

    if (error) throw new Error('Agency retrieval failed in billing');

    if (agency?.stripe_customer_id) {
      return agency.stripe_customer_id;
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { agency_id: agencyId },
    });

    await admin
      .from('agencies')
      .update({ stripe_customer_id: customer.id })
      .eq('id', agencyId);

    return customer.id;
  }

  async createCheckoutSession(
    agencyId: string,
    userId: string,
    customerEmail: string,
    customerName: string,
    agencySlug: string,
  ) {
    const plan = getImmisignPlan();
    const admin = createAdminClient();
    const billableCount = await countActiveBillableUsers(admin, agencyId);
    const additionalSeats = additionalSeatsFromBillableCount(billableCount);

    const customerId = await this.getOrCreateCustomer(
      agencyId,
      customerEmail,
      customerName,
    );

    const billingBase = `${getAppUrl()}/workspace/${agencySlug}/billing`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: plan.baseMonthlyPriceId, quantity: 1 },
    ];

    if (additionalSeats > 0) {
      lineItems.push({
        price: plan.seatMonthlyPriceId,
        quantity: additionalSeats,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: lineItems,
      success_url: `${billingBase}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: billingBase,
      metadata: {
        agency_id: agencyId,
        user_id: userId,
        plan_id: plan.id,
      },
      subscription_data: {
        metadata: { agency_id: agencyId },
      },
    });

    return { url: session.url };
  }

  async createBillingPortalSession(customerId: string, returnUrl: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Aligns the Stripe seat line-item quantity with active billable users.
   */
  async syncSubscriptionSeats(agencyId: string): Promise<{
    billableSeats: number;
    additionalSeats: number;
    synced: boolean;
  }> {
    const plan = getImmisignPlan();
    const admin = createAdminClient();
    const billableSeats = await countActiveBillableUsers(admin, agencyId);
    const additionalSeats = additionalSeatsFromBillableCount(billableSeats);

    const { data: sub } = (await admin
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_seat_item_id')
      .eq('agency_id', agencyId)
      .maybeSingle()) as {
      data: {
        stripe_subscription_id?: string | null;
        stripe_seat_item_id?: string | null;
      } | null;
    };

    if (!sub?.stripe_subscription_id) {
      await admin
        .from('subscriptions')
        .upsert(
          {
            agency_id: agencyId,
            plan_name: plan.id,
            billable_seats: billableSeats,
            additional_seats: additionalSeats,
            included_seats: plan.includedSeats,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'agency_id' },
        );
      return { billableSeats, additionalSeats, synced: false };
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ['items.data.price'],
    });

    let seatItem = stripeSub.items.data.find(
      (item) => item.price.id === plan.seatMonthlyPriceId,
    );

    if (seatItem) {
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: additionalSeats,
        proration_behavior: 'create_prorations',
      });
    } else if (additionalSeats > 0) {
      seatItem = await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: plan.seatMonthlyPriceId,
        quantity: additionalSeats,
        proration_behavior: 'create_prorations',
      });
    }

    const seatItemId = seatItem?.id ?? null;

    await admin
      .from('subscriptions')
      .update({
        billable_seats: billableSeats,
        additional_seats: additionalSeats,
        included_seats: plan.includedSeats,
        stripe_seat_item_id: seatItemId,
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId);

    await admin
      .from('agencies')
      .update({
        plan_type: plan.id,
        max_users: plan.includedSeats + additionalSeats,
      })
      .eq('id', agencyId);

    return { billableSeats, additionalSeats, synced: true };
  }

  async getUpcomingInvoiceAmountCents(customerId: string): Promise<number | null> {
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({ customer: customerId });
      return upcoming.amount_due ?? null;
    } catch {
      return null;
    }
  }

  /** Pull latest Stripe subscription into DB (checkout fallback / manual sync). */
  async syncSubscriptionFromStripe(agencyId: string): Promise<{
    synced: boolean;
    subscriptionId?: string;
    status?: string;
  }> {
    const plan = getImmisignPlan();
    const admin = createAdminClient();

    const { data: agency } = (await admin
      .from('agencies')
      .select('stripe_customer_id')
      .eq('id', agencyId)
      .maybeSingle()) as { data: { stripe_customer_id?: string | null } | null };

    const customerId = agency?.stripe_customer_id;
    if (!customerId) return { synced: false };

    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 3,
    });

    const sub =
      list.data.find((s) => s.status === 'active' || s.status === 'trialing') ||
      list.data[0];
    if (!sub) return { synced: false };

    const baseItem = sub.items.data.find(
      (item) => item.price.id === plan.baseMonthlyPriceId,
    );
    const seatItem = sub.items.data.find(
      (item) => item.price.id === plan.seatMonthlyPriceId,
    );

    const billableSeats = await countActiveBillableUsers(admin, agencyId);
    const additionalSeats =
      seatItem?.quantity ?? additionalSeatsFromBillableCount(billableSeats);
    const period = resolveSubscriptionPeriod(sub);

    await admin.from('subscriptions').upsert(
      {
        agency_id: agencyId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_price_id: baseItem?.price.id || sub.items.data[0]?.price.id,
        stripe_base_price_id: plan.baseMonthlyPriceId,
        stripe_seat_price_id: plan.seatMonthlyPriceId,
        stripe_seat_item_id: seatItem?.id ?? null,
        plan_name: plan.id,
        status: sub.status,
        billing_cycle: 'monthly',
        current_period_start: period.start,
        current_period_end: period.end,
        cancel_at_period_end: sub.cancel_at_period_end,
        included_seats: plan.includedSeats,
        billable_seats: billableSeats,
        additional_seats: additionalSeats,
        seats: plan.includedSeats + additionalSeats,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agency_id' },
    );

    await admin
      .from('agencies')
      .update({
        subscription_status: sub.status,
        plan_type: plan.id,
        max_users: plan.includedSeats + additionalSeats,
        max_documents: 999999,
      })
      .eq('id', agencyId);

    return { synced: true, subscriptionId: sub.id, status: sub.status };
  }

  async syncSubscriptionFromCheckoutSession(
    agencyId: string,
    checkoutSessionId: string,
  ): Promise<{ synced: boolean; subscriptionId?: string }> {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['subscription'],
    });

    if (session.metadata?.agency_id && session.metadata.agency_id !== agencyId) {
      throw new Error('Checkout session agency mismatch');
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (customerId) {
      const admin = createAdminClient();
      await admin
        .from('agencies')
        .update({ stripe_customer_id: customerId })
        .eq('id', agencyId);
    }

    return this.syncSubscriptionFromStripe(agencyId);
  }
}

export const stripeService = new StripeService();

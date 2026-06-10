import crypto from 'crypto';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { getImmisignPlan } from '@/lib/stripe/plan';
import {
  additionalSeatsFromBillableCount,
  countActiveBillableUsers,
} from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { resolveSubscriptionPeriod } from '@/lib/stripe/subscription-period';
import {
  markWebhookEventProcessed,
  recordWebhookEvent,
} from '@/lib/integrations/webhook-events';

function payloadHash(body: string): string {
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex');
}

async function upsertSubscriptionFromStripeSub(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  sub: Stripe.Subscription,
) {
  const plan = getImmisignPlan();
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
      stripe_customer_id: sub.customer as string,
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
      stripe_customer_id: sub.customer as string,
      subscription_status: sub.status,
      plan_type: plan.id,
      max_users: plan.includedSeats + additionalSeats,
      max_documents: 999999,
    })
    .eq('id', agencyId);
}

async function upsertInvoiceFromStripe(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
) {
  const { data: ag } = await admin
    .from('agencies')
    .select('id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (!ag) return;

  await admin.from('invoices').upsert(
    {
      agency_id: ag.id,
      stripe_invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      status: invoice.status,
      billing_reason: invoice.billing_reason,
      paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
      due_date: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null,
    },
    { onConflict: 'stripe_invoice_id' },
  );
}

export async function POST(req: Request) {
  let auditEventId: string | null = null;

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret || !signature) {
      return NextResponse.json(
        { error: 'Missing securely defined webhook config or headers' },
        { status: 400 },
      );
    }

    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook Signature Error: ${message}`);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const hash = payloadHash(body);

    auditEventId = await recordWebhookEvent(admin, {
      provider: 'stripe',
      eventType: stripeEvent.type,
      externalId: stripeEvent.id,
      payload: stripeEvent as unknown as Record<string, unknown>,
      payloadHash: hash,
      status: 'received',
    });

    const { error: logErr } = await admin.from('webhook_logs').insert([
      {
        provider: 'stripe',
        event_id: stripeEvent.id,
        event_type: stripeEvent.type,
        payload: stripeEvent as unknown as Record<string, unknown>,
        status: 'processing',
      },
    ]);

    if (logErr && logErr.code === '23505') {
      if (auditEventId) {
        await markWebhookEventProcessed(admin, auditEventId, 'processed');
      }
      return NextResponse.json(
        { status: 'Ignored: duplicate event locked implicitly' },
        { status: 200 },
      );
    }
    if (logErr) {
      console.error('Webhook insert lock failed:', logErr);
      if (auditEventId) {
        await markWebhookEventProcessed(admin, auditEventId, 'failed', logErr.message);
      }
      return NextResponse.json({ error: 'System Lock Error' }, { status: 500 });
    }

    const evtType = stripeEvent.type;
    let agencyId: string | null =
      (stripeEvent.data.object as { metadata?: { agency_id?: string } })?.metadata
        ?.agency_id ?? null;

    try {
      if (evtType === 'checkout.session.completed') {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        agencyId = session.metadata?.agency_id ?? agencyId;
        if (!agencyId) throw new Error('Untrackable Checkout Session');

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;
        if (customerId) {
          await admin
            .from('agencies')
            .update({ stripe_customer_id: customerId })
            .eq('id', agencyId);
        }

        if (session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ['items.data.price'],
          });
          await upsertSubscriptionFromStripeSub(admin, agencyId, sub);
        }

        await stripeService.syncSubscriptionSeats(agencyId);
      } else if (
        evtType === 'customer.subscription.created' ||
        evtType === 'customer.subscription.updated'
      ) {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        agencyId = sub.metadata?.agency_id ?? agencyId;
        if (!agencyId) {
          throw new Error(`Untracked subscription metadata on sub ${sub.id}`);
        }
        await upsertSubscriptionFromStripeSub(admin, agencyId, sub);
      } else if (evtType === 'customer.subscription.deleted') {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        agencyId = sub.metadata?.agency_id ?? agencyId;
        if (agencyId) {
          await admin
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', sub.id);

          await admin
            .from('agencies')
            .update({ subscription_status: 'canceled' })
            .eq('id', agencyId);
        }
      } else if (
        evtType === 'invoice.paid' ||
        evtType === 'invoice.payment_succeeded' ||
        evtType === 'invoice.finalized' ||
        evtType === 'invoice.payment_failed'
      ) {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await upsertInvoiceFromStripe(admin, invoice);
      }

      await admin
        .from('webhook_logs')
        .update({ status: 'success', processed_at: new Date().toISOString() })
        .eq('event_id', stripeEvent.id);

      if (auditEventId) {
        await markWebhookEventProcessed(admin, auditEventId, 'processed');
        if (agencyId) {
          await admin
            .from('webhook_events')
            .update({ agency_id: agencyId })
            .eq('id', auditEventId);
        }
      }

      return NextResponse.json({ received: true });
    } catch (procErr: unknown) {
      const message = procErr instanceof Error ? procErr.message : 'Processing failed';
      console.error('Critical Webhook processing err:', procErr);
      await admin
        .from('webhook_logs')
        .update({ status: 'failed_processing' })
        .eq('event_id', stripeEvent.id);
      if (auditEventId) {
        await markWebhookEventProcessed(admin, auditEventId, 'failed', message);
      }
      return NextResponse.json({ error: 'Data processing error' }, { status: 500 });
    }
  } catch {
    if (auditEventId) {
      const admin = createAdminClient();
      await markWebhookEventProcessed(admin, auditEventId, 'failed', 'Internal error');
    }
    return NextResponse.json({ error: 'Internal Server err' }, { status: 500 });
  }
}

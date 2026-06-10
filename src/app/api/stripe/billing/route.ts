import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { getImmisignPlan } from '@/lib/stripe/plan';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/stripe/billing', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const sessionId = req.nextUrl.searchParams.get('session_id')?.trim();
    const role = String(ctx.dbRole || '').toLowerCase();
    if (sessionId && ['owner', 'admin'].includes(role)) {
      try {
        await stripeService.syncSubscriptionFromCheckoutSession(ctx.agencyId, sessionId);
        await stripeService.syncSubscriptionSeats(ctx.agencyId);
      } catch (e) {
        console.warn('[billing] checkout session sync:', e);
      }
    }

    let plan;
    try {
      plan = getImmisignPlan();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Billing is not configured';
      return apiError(message, 503);
    }

    const seats = await getAgencySeatSnapshot(ctx.supabase, ctx.agencyId);

    const { data: sub } = await ctx.supabase
      .from('subscriptions')
      .select(
        'status, plan_name, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, additional_seats, billable_seats',
      )
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    const admin = createAdminClient();
    const { data: agencyRow } = (await admin
      .from('agencies')
      .select('stripe_customer_id, subscription_status')
      .eq('id', ctx.agencyId)
      .maybeSingle()) as {
      data: { stripe_customer_id?: string; subscription_status?: string } | null;
    };

    const customerId =
      sub?.stripe_customer_id || agencyRow?.stripe_customer_id || null;

    let nextInvoiceAmountCents: number | null = null;
    if (customerId && ['owner', 'admin'].includes(role)) {
      nextInvoiceAmountCents =
        await stripeService.getUpcomingInvoiceAmountCents(customerId);
    }

    const { data: invoices, error: invoicesError } = await ctx.supabase
      .from('invoices')
      .select(
        'stripe_invoice_id, amount_paid, currency, status, hosted_invoice_url, invoice_pdf, paid_at, created_at',
      )
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (invoicesError) {
      console.warn('[billing] invoices fetch:', invoicesError.message);
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        baseMonthlyUsd: plan.basePriceMonthlyUsd,
        seatMonthlyUsd: plan.seatPriceMonthlyUsd,
        features: plan.features,
      },
      subscription: {
        status: sub?.status || agencyRow?.subscription_status || 'trialing',
        planName: sub?.plan_name || plan.id,
        currentPeriodEnd: sub?.current_period_end,
        cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
        hasStripeSubscription: Boolean(sub?.stripe_subscription_id),
      },
      seats: {
        included: seats.includedSeats,
        used: seats.usedSeats,
        pendingInvites: seats.pendingBillableInvites,
        additional: seats.additionalSeats,
        monthlyTotalUsd: seats.monthlyTotalUsd,
      },
      nextInvoice: {
        amountCents: nextInvoiceAmountCents,
        amountUsd:
          nextInvoiceAmountCents != null
            ? (nextInvoiceAmountCents / 100).toFixed(2)
            : null,
      },
      invoices: (invoices ?? []).map((inv) => ({
        id: inv.stripe_invoice_id,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        paidAt: inv.paid_at,
        createdAt: inv.created_at,
      })),
    });
  });
}

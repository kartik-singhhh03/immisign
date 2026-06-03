import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getImmisignPlan } from '@/lib/stripe/plan';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { handleServerError } from '@/lib/utils/errors';

export async function GET() {
  try {
    const { agency, profile } = await requireAgency();
    const supabase = await createClient();
    const plan = getImmisignPlan();

    const seats = await getAgencySeatSnapshot(supabase, agency.id);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select(
        'status, plan_name, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, additional_seats, billable_seats',
      )
      .eq('agency_id', agency.id)
      .maybeSingle();

    const admin = createAdminClient();
    const { data: agencyRow } = (await admin
      .from('agencies')
      .select('stripe_customer_id, subscription_status')
      .eq('id', agency.id)
      .single()) as {
      data: { stripe_customer_id?: string; subscription_status?: string } | null;
    };

    const customerId =
      sub?.stripe_customer_id || agencyRow?.stripe_customer_id || null;

    let nextInvoiceAmountCents: number | null = null;
    if (customerId && ['owner', 'admin'].includes(profile.role!)) {
      nextInvoiceAmountCents =
        await stripeService.getUpcomingInvoiceAmountCents(customerId);
    }

    const { data: invoices } = await supabase
      .from('invoices')
      .select(
        'stripe_invoice_id, amount_paid, currency, status, hosted_invoice_url, invoice_pdf, paid_at, created_at',
      )
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false })
      .limit(12);

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
  } catch (err: unknown) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}

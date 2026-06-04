import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { getImmisignPlan } from '@/lib/stripe/plan';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET() {
  return withApiRoute('GET /api/stripe/usage', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    let plan;
    try {
      plan = getImmisignPlan();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Billing is not configured';
      return apiError(message, 503);
    }

    const { data: sub } = await ctx.supabase
      .from('subscriptions')
      .select(
        'plan_name, status, current_period_end, cancel_at_period_end, additional_seats',
      )
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    const { data: agencyRow } = await ctx.supabase
      .from('agencies')
      .select('subscription_status')
      .eq('id', ctx.agencyId)
      .maybeSingle();

    const seats = await getAgencySeatSnapshot(ctx.supabase, ctx.agencyId);

    const { count: docsCount } = await ctx.supabase
      .from('agreements')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', ctx.agencyId);

    return NextResponse.json({
      plan: sub?.plan_name || plan.id,
      status: sub?.status || agencyRow?.subscription_status || 'trialing',
      current_period_end: sub?.current_period_end,
      cancel_at: sub?.cancel_at_period_end,
      seats: {
        included: seats.includedSeats,
        used: seats.usedSeats,
        additional: seats.additionalSeats,
        monthly_total_usd: seats.monthlyTotalUsd,
      },
      usage: {
        active_users: seats.usedSeats,
        documents_used: docsCount || 0,
      },
    });
  });
}

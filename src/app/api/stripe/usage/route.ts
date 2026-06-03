import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getImmisignPlan } from '@/lib/stripe/plan';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { handleServerError } from '@/lib/utils/errors';

export async function GET() {
  try {
    const { agency } = await requireAgency();
    const supabase = await createClient();
    const plan = getImmisignPlan();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select(
        'plan_name, status, current_period_end, cancel_at_period_end, additional_seats',
      )
      .eq('agency_id', agency.id)
      .maybeSingle();

    const seats = await getAgencySeatSnapshot(supabase, agency.id);

    const { count: docsCount } = await supabase
      .from('agreements')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency.id);

    return NextResponse.json({
      plan: sub?.plan_name || plan.id,
      status: sub?.status || agency.subscription_status || 'trialing',
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
  } catch (err: unknown) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}

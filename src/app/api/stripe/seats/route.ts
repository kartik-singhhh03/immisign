import { NextRequest, NextResponse } from 'next/server';
import { requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { seatPreviewQuerySchema } from '@/lib/stripe/validators';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { handleServerError } from '@/lib/utils/errors';

/** Preview seat impact before inviting (GET) or sync Stripe quantities (POST). */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgency();
    const supabase = await createClient();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { role } = seatPreviewQuerySchema.parse(params);

    const snapshot = await getAgencySeatSnapshot(supabase, agency.id, {
      includePendingInviteRole: role,
    });

    return NextResponse.json({
      includedSeats: snapshot.includedSeats,
      usedSeats: snapshot.usedSeats,
      additionalSeats: snapshot.additionalSeats,
      monthlyTotalUsd: snapshot.monthlyTotalUsd,
      wouldIncreaseSubscription: snapshot.wouldIncreaseSubscription,
      seatIncreaseUsd: snapshot.nextSeatIncreaseUsd,
      warning: snapshot.wouldIncreaseSubscription
        ? `Adding this user will increase your subscription by $${snapshot.nextSeatIncreaseUsd}/month.`
        : null,
    });
  } catch (err: unknown) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}

export async function POST() {
  try {
    const { profile, agency } = await requireAgency();

    if (!['owner', 'admin'].includes(profile.role!)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const result = await stripeService.syncSubscriptionSeats(agency.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}

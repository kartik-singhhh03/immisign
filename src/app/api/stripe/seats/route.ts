import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { seatPreviewQuerySchema } from '@/lib/stripe/validators';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

/** Preview seat impact before inviting (GET) or sync Stripe quantities (POST). */
export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/stripe/seats', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { role } = seatPreviewQuerySchema.parse(params);

    const snapshot = await getAgencySeatSnapshot(ctx.supabase, ctx.agencyId, {
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
  });
}

export async function POST() {
  return withApiRoute('POST /api/stripe/seats', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return apiError('Permission denied', 403);
    }

    const result = await stripeService.syncSubscriptionSeats(ctx.agencyId);
    return NextResponse.json(result);
  });
}

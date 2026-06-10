import { NextRequest } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { stripeService } from '@/lib/stripe/service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/stripe/sync', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return apiError('Only owners or admins can sync billing', 403);
    }

    const body = await req.json().catch(() => ({}));
    const sessionId =
      typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';

    const result = sessionId
      ? await stripeService.syncSubscriptionFromCheckoutSession(ctx.agencyId, sessionId)
      : await stripeService.syncSubscriptionFromStripe(ctx.agencyId);

    if (!result.synced) {
      return apiError('No Stripe subscription found for this agency', 404);
    }

    await stripeService.syncSubscriptionSeats(ctx.agencyId);

    return Response.json({ success: true, ...result });
  });
}

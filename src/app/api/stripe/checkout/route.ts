import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { stripeService } from '@/lib/stripe/service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function POST() {
  return withApiRoute('POST /api/stripe/checkout', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return apiError('Only owners or admins can modify billing', 403);
    }

    const session = await stripeService.createCheckoutSession(
      ctx.agencyId,
      ctx.userId,
      ctx.profile.email as string,
      ctx.agencyName || 'Agency',
      ctx.agencySlug || '',
    );

    if (!session.url) {
      return apiError('Stripe failed to provision checkout URL', 500);
    }

    return Response.json({ url: session.url });
  });
}

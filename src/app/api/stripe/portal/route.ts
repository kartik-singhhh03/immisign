import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { portalRequestSchema } from '@/lib/stripe/validators';
import { stripeService } from '@/lib/stripe/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function POST(req: Request) {
  return withApiRoute('POST /api/stripe/portal', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return apiError('Permission denied', 403);
    }

    const body = await req.json();
    const { returnUrl } = portalRequestSchema.parse(body);

    const admin = createAdminClient();
    const { data: dbAgency } = await admin
      .from('agencies')
      .select('stripe_customer_id')
      .eq('id', ctx.agencyId)
      .maybeSingle();

    if (!dbAgency?.stripe_customer_id) {
      return apiError('No active billing identity established.', 400);
    }

    const billingReturnUrl =
      returnUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/workspace/${ctx.agencySlug}/billing`;

    const session = await stripeService.createBillingPortalSession(
      dbAgency.stripe_customer_id,
      billingReturnUrl,
    );

    return Response.json({ url: session.url });
  });
}

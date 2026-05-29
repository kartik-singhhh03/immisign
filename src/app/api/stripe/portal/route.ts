import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { portalRequestSchema } from '@/lib/stripe/validators';
import { stripeService } from '@/lib/stripe/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleServerError } from '@/lib/utils/errors';

export async function POST(req: Request) {
  try {
    const { profile, agency } = await requireAgency();
    
    if (!['owner', 'admin'].includes(profile.role!)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { returnUrl } = portalRequestSchema.parse(body);

    const admin = createAdminClient();
    const { data: dbAgency } = await admin.from('agencies').select('stripe_customer_id').eq('id', agency.id).single();

    if (!dbAgency || !dbAgency.stripe_customer_id) {
       return NextResponse.json({ error: 'No active billing identity established.' }, { status: 400 });
    }

    const session = await stripeService.createBillingPortalSession(dbAgency.stripe_customer_id, returnUrl);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    const safeError = handleServerError(err);
    if (err && err.name === 'ZodError') safeError.code = 'VALIDATION_ERROR';

    return NextResponse.json(safeError, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { checkoutRequestSchema } from '@/lib/stripe/validators';
import { stripeService } from '@/lib/stripe/service';
import { handleServerError } from '@/lib/utils/errors';

export async function POST(req: Request) {
  try {
    const { profile, agency } = await requireAgency();
    
    // RBAC: Only Owners and Admins control financial instruments
    if (!['owner', 'admin'].includes(profile.role!)) {
        return NextResponse.json({ error: 'Only owners or admins can modify billing' }, { status: 403 });
    }

    const body = await req.json();
    const { priceId } = checkoutRequestSchema.parse(body);

    const session = await stripeService.createCheckoutSession(
        agency.id, 
        profile.id, 
        profile.email, 
        agency.name,
        priceId,
        agency.slug,
    );

    if (!session.url) throw new Error('Stripe failed to provision URL');

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    const safeError = handleServerError(err);
    // Zod parsing specific exception mapping
    if (err && err.name === 'ZodError') safeError.code = 'VALIDATION_ERROR';

    return NextResponse.json(safeError, { status: safeError.code === 'VALIDATION_ERROR' ? 400 : 500 });
  }
}

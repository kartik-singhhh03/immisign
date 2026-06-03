import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/supabase/auth';
import { stripeService } from '@/lib/stripe/service';
import { handleServerError } from '@/lib/utils/errors';

export async function POST() {
  try {
    const { profile, agency } = await requireAgency();

    if (!['owner', 'admin'].includes(profile.role!)) {
      return NextResponse.json(
        { error: 'Only owners or admins can modify billing' },
        { status: 403 },
      );
    }

    const session = await stripeService.createCheckoutSession(
      agency.id,
      profile.id,
      profile.email,
      agency.name,
      agency.slug,
    );

    if (!session.url) throw new Error('Stripe failed to provision URL');

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { SignWellService } from '@/features/agreements/services/signwell.service';
import { handleServerError } from '@/lib/utils/errors';

export async function POST(req: Request) {
  try {
    await requireAuth();
    const { profile, agency } = await requireAgency();

    if (!['owner', 'admin', 'manager', 'agent'].includes(profile.role!)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { agreementId } = body;

    if (!agreementId) {
      return NextResponse.json({ error: 'Missing agreementId' }, { status: 400 });
    }

    const supabase = await createClient();
    const swService = new SignWellService(supabase);
    const result = await swService.sendForSignature(
      agency.id,
      profile.id,
      profile.role as any,
      agreementId,
    );

    return NextResponse.json({
      message: 'Successfully sent agreement. Agent signature applied automatically; external signers notified via SignWell.',
      signwellDocId: result.id,
      status: result.status,
    });
  } catch (err: unknown) {
    const safeErr = handleServerError(err);
    const statusCode =
      safeErr.code === 'UNAUTHORIZED' || safeErr.code === 'FORBIDDEN'
        ? 403
        : safeErr.code === 'NOT_FOUND'
          ? 404
          : safeErr.code === 'VALIDATION_ERROR'
            ? 400
            : 500;

    return NextResponse.json(safeErr, { status: statusCode });
  }
}

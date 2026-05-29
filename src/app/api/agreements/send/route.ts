import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { createAndSendAgreementPackage } from '@/lib/signwell/service';
import { handleServerError } from '@/lib/utils/errors';

export async function POST(req: Request) {
  try {
    // 1. Authorize tenant
    await requireAuth();
    const { profile } = await requireAgency();

    // Only allow specific RBAC roles to fire documents out
    if (!['owner', 'admin', 'manager', 'agent'].includes(profile.role!)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 2. Body Payload
    const body = await req.json();
    const { agreementId } = body;

    if (!agreementId) {
        return NextResponse.json({ error: 'Missing agreementId' }, { status: 400 });
    }

    // 3. Command the SignWell abstraction boundary 
    const result = await createAndSendAgreementPackage(agreementId);

    // 4. Client Res
    return NextResponse.json({ 
        message: 'Successfully sent out agreement workflow.',
        signwellDocId: result.id,
        status: result.status
    });

  } catch (err: any) {
    const safeErr = handleServerError(err);
    const statusCode = safeErr.code === 'UNAUTHORIZED' || safeErr.code === 'FORBIDDEN' ? 403 : 
                       safeErr.code === 'NOT_FOUND' ? 404 : 
                       safeErr.code === 'VALIDATION_ERROR' ? 400 : 500;

    return NextResponse.json(safeErr, { status: statusCode });
  }
}

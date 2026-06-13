import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/application-approvals', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const status = req.nextUrl.searchParams.get('status');
    let query = ctx.supabase
      .from('application_approvals')
      .select('*, clients(name, email)', { count: 'exact' })
      .eq('agency_id', ctx.agencyId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return apiError(error.message, 500);
    return NextResponse.json({ data: data || [], total: count || 0 });
  });
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/application-approvals', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const { clientId, matterId, matterReference, visaSubclass, visaStream, fileSource, fileId } = body;

    if (!clientId || !matterReference || !visaSubclass) {
      return apiError('clientId, matterReference, and visaSubclass are required', 400);
    }

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const approval = await svc.createDraft({
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      clientId,
      matterId: matterId || null,
      matterReference,
      visaSubclass,
      visaStream: visaStream || null,
      fileSource,
      fileId,
    });

    return NextResponse.json({ approval });
  });
}

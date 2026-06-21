import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('GET /api/application-approvals/[id]/record', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    try {
      const url = await svc.getApprovalRecordDownloadUrl(ctx.agencyId, params.id);
      return NextResponse.redirect(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not download approval record';
      if (message.includes('not found')) return apiError('Not found', 404);
      if (message.includes('not yet generated')) return apiError(message, 404);
      return apiError(message, 500);
    }
  });
}

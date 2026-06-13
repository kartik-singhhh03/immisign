import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withApiRoute('GET /api/approvals/widgets', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const widgets = await svc.getWidgetCounts(ctx.agencyId);
    return NextResponse.json({ success: true, widgets });
  });
}

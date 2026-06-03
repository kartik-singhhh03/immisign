import { NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET() {
  return withApiRoute('GET /api/approvals/widgets', async () => {
    const ctx = await getApprovalApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const service = new ApprovalService(ctx.supabase);
    const widgets = await service.getWidgetCounts(ctx.agencyId, ctx.userId, ctx.dbRole);
    return NextResponse.json({ success: true, widgets });
  });
}

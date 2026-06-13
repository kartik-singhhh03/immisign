import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { resolveAppUrlForEmail } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('POST /api/application-approvals/[id]/send', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const result = await svc.sendForClientApproval({
      agencyId: ctx.agencyId,
      agencySlug: ctx.agencySlug,
      userId: ctx.userId,
      approvalId: params.id,
      appUrl: resolveAppUrlForEmail(),
    });

    return NextResponse.json(result);
  });
}

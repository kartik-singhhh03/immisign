import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('GET /api/application-approvals/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const approval = await svc.getById(ctx.agencyId, params.id);
    if (!approval) return apiError('Not found', 404);
    return NextResponse.json({ approval });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('PATCH /api/application-approvals/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const patch: Record<string, unknown> = {};
    if (body.message_subject !== undefined) patch.message_subject = body.message_subject;
    if (body.message_body !== undefined) patch.message_body = body.message_body;
    if (body.clear_file === true) {
      patch.application_file_path = null;
      patch.application_file_name = null;
      patch.application_file_size = null;
    }

    const approval = await svc.updateDraft(ctx.agencyId, params.id, patch);
    return NextResponse.json({ approval });
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import {
  APPLICATION_APPROVALS_BUCKET,
  ApplicationApprovalRebuildService,
} from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('POST /api/application-approvals/[id]/upload', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const svc = new ApplicationApprovalRebuildService(ctx.supabase);
    const approval = await svc.getById(ctx.agencyId, params.id);
    if (!approval) return apiError('Not found', 404);
    if (approval.status !== 'draft') return apiError('Cannot upload — approval already sent', 400);
    if (!approval.matter_id) return apiError('Matter not linked', 400);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return apiError('No file provided', 400);

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      return apiError('Only PDF and DOCX files are allowed', 400);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = svc.storagePath(ctx.agencyId, approval.matter_id, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await ctx.supabase.storage
      .from(APPLICATION_APPROVALS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return apiError(uploadError.message, 500);

    const updated = await svc.updateDraft(ctx.agencyId, params.id, {
      application_file_path: path,
      application_file_name: file.name,
      application_file_size: file.size,
    });

    return NextResponse.json({ approval: updated });
  });
}

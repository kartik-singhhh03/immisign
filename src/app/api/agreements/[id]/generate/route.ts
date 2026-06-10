import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return withApiRoute('POST /api/agreements/[id]/generate', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin', 'manager', 'agent'].includes(role)) {
      return apiError('Permission denied', 403);
    }

    const agreementId = params.id;
    if (!agreementId) {
      return apiError('Missing agreement id', 400);
    }

    const docService = new DocumentGenerationService(ctx.supabase);
    const result = await docService.generateDocument(ctx.agencyId, ctx.userId, agreementId);

    return NextResponse.json({
      success: true,
      storagePath: result.storagePath,
      size: result.size,
      timeMs: result.timeMs,
      status: 'pending',
    });
  });
}

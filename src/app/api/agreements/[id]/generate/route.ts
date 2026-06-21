import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { AgreementRepository } from '@/features/agreements/repositories/agreement.repository';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

const GENERATABLE_STATUSES = new Set(['draft', 'pending', 'generated']);

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

    const agreementRepo = new AgreementRepository(ctx.supabase);
    const agreement = await agreementRepo.getById(agreementId);
    if (!agreement || agreement.agency_id !== ctx.agencyId) {
      return apiError('Agreement not found', 404);
    }
    if (!GENERATABLE_STATUSES.has(agreement.status)) {
      return apiError(
        `Cannot generate PDF for agreement in ${agreement.status} status`,
        400,
      );
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

import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { AgreementRepository } from '@/features/agreements/repositories/agreement.repository';
import { AuditService } from '@/features/agreements/services/audit.service';
import { AgreementStatus } from '@/features/agreements/types';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

const BLOCKED_STATUSES = new Set([
  AgreementStatus.SIGNED,
  AgreementStatus.COMPLETED,
  AgreementStatus.CANCELLED,
]);

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return withApiRoute('POST /api/agreements/[id]/regenerate', async () => {
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

    if (BLOCKED_STATUSES.has(agreement.status as AgreementStatus)) {
      return apiError('Cannot regenerate a signed or cancelled agreement', 400);
    }

    const docService = new DocumentGenerationService(ctx.supabase);
    const auditService = new AuditService(ctx.supabase);

    try {
      const result = await docService.regenerateAgreementPdf(
        ctx.agencyId,
        ctx.userId,
        agreementId,
      );

      await auditService.logEvent(ctx.agencyId, ctx.userId, agreementId, 'Agreement Regenerated', {
        storagePath: result.storagePath,
        size: result.size,
      });

      return NextResponse.json({
        success: true,
        storagePath: result.storagePath,
        size: result.size,
      });
    } catch (regenErr) {
      const message = regenErr instanceof Error ? regenErr.message : 'Regeneration failed';
      if (
        agreement.status === AgreementStatus.DRAFT ||
        agreement.status === AgreementStatus.GENERATED
      ) {
        const result = await docService.generateDocument(ctx.agencyId, ctx.userId, agreementId);
        return NextResponse.json({
          success: true,
          storagePath: result.storagePath,
          size: result.size,
          timeMs: result.timeMs,
        });
      }
      return apiError(message, 400);
    }
  });
}

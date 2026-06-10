import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { dbRoleToUi } from '@/lib/auth/db-roles';
import { SignWellService } from '@/features/agreements/services/signwell.service';
import { Role } from '@/features/auth/types/roles';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return withApiRoute('POST /api/agreements/send', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin', 'manager', 'agent'].includes(role)) {
      return apiError('Permission denied', 403);
    }

    const body = await req.json();
    const { agreementId } = body as { agreementId?: string };

    if (!agreementId) {
      return apiError('Missing agreementId', 400);
    }

    const uiRole = dbRoleToUi(ctx.dbRole);
    const signwellRole =
      Object.values(Role).find((r) => r === uiRole) ?? Role.MIGRATION_AGENT;

    const swService = new SignWellService(ctx.supabase);
    const result = await swService.sendForSignature(
      ctx.agencyId,
      ctx.userId,
      signwellRole,
      agreementId,
    );

    return NextResponse.json({
      message:
        'Successfully sent agreement. Agent signature applied automatically; external signers notified via SignWell.',
      signwellDocId: result.id,
      status: result.status,
    });
  });
}

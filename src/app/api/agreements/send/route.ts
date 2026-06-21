import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { dbRoleToUi } from '@/lib/auth/db-roles';
import { Role } from '@/features/auth/types/roles';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { createAgreementSigningProvider } from '@/lib/signing/provider-factory';
import { getSigningProvider } from '@/lib/signing/config';

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
    const { agreementId, dispatchOptions } = body as {
      agreementId?: string;
      dispatchOptions?: Record<string, unknown>;
    };

    if (!agreementId) {
      return apiError('Missing agreementId', 400);
    }

    const uiRole = dbRoleToUi(ctx.dbRole);
    const signwellRole =
      Object.values(Role).find((r) => r === uiRole) ?? Role.MIGRATION_AGENT;

    const providerName = getSigningProvider();
    const provider = createAgreementSigningProvider(ctx.supabase, providerName);
    const result = await provider.sendForSignature({
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      role: signwellRole,
      agreementId,
      dispatchOptions,
    });

    if (providerName === 'native') {
      return NextResponse.json({
        message: 'Successfully sent agreement via ImmiSign native signing portal.',
        signingProvider: 'native',
        signingUrl: result.signingUrl,
        signingToken: result.signingToken,
      });
    }

    return NextResponse.json({
      message:
        'Successfully sent agreement. Agent signature applied automatically; external signers notified via SignWell.',
      signingProvider: 'signwell',
      signwellDocId: result.signwellDocumentId,
    });
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { getClientMatterCompliance } from '@/features/compliance/services/client-matter-compliance.service';
import type { ClientFileSource } from '@/features/file-notes/services/client-files.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiRoute('GET /api/clients/[id]/compliance', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const { id: clientId } = await params;
    const fileSource = req.nextUrl.searchParams.get('file_source') as ClientFileSource | null;
    const fileId = req.nextUrl.searchParams.get('file_id');

    if (!fileSource || !fileId) {
      return apiError('file_source and file_id are required for matter-scoped compliance', 400);
    }

    if (fileSource !== 'agreement' && fileSource !== 'application_approval') {
      return apiError('file_source must be agreement or application_approval', 400);
    }

    const { data: client } = await ctx.supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    if (!client) {
      return apiError('Client not found', 404);
    }

    try {
      const compliance = await getClientMatterCompliance(
        ctx.supabase,
        ctx.agencyId,
        clientId,
        fileSource,
        fileId,
      );
      return NextResponse.json({ success: true, ...compliance });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Compliance lookup failed';
      const status = message.includes('not found') ? 404 : 500;
      return apiError(message, status);
    }
  });
}

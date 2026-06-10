import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { getClientSosContext } from '@/features/service-statements/services/client-sos-context.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { searchParams } = new URL(req.url);
  const fileSource = searchParams.get('file_source') as
    | 'agreement'
    | 'application_approval'
    | null;
  const fileId = searchParams.get('file_id');
  const agreementId = searchParams.get('agreement_id');
  const approvalId = searchParams.get('approval_id');

  try {
    const context = await getClientSosContext(ctx.supabase, ctx.agencyId, params.id, {
      fileSource: fileSource || undefined,
      fileId: fileId || undefined,
      agreementId: agreementId || undefined,
      approvalId: approvalId || undefined,
    });
    return NextResponse.json({ success: true, context });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load client context';
    const status = message === 'Client not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

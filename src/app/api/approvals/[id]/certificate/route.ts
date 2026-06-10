import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const signedUrl = await service.getCertificateSignedUrl(
      ctx.agencyId,
      params.id,
      ctx.dbRole,
      ctx.userId,
    );
    return NextResponse.json({ success: true, signedUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Certificate unavailable';
    const status = message === 'Not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const approval = await service.ensureCertificate(ctx.agencyId, params.id);
    const signedUrl = await service.getCertificateSignedUrl(
      ctx.agencyId,
      params.id,
      ctx.dbRole,
      ctx.userId,
    );
    return NextResponse.json({ success: true, approval, signedUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Certificate generation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

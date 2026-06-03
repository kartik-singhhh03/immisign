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

  try {
    const service = new ApprovalService(ctx.supabase);
    const detail = await service.getDetail(ctx.agencyId, params.id, ctx.dbRole, ctx.userId);
    return NextResponse.json({ success: true, ...detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    const status = message === 'Not found' ? 404 : message === 'Unauthorized' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const service = new ApprovalService(ctx.supabase);

  try {
    const approval = await service.updateDraft(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
      body,
    );
    return NextResponse.json({ success: true, approval });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

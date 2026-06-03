import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  if (!body.itemId) {
    return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const item = await service.toggleChecklistItem(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
      body.itemId,
      Boolean(body.is_completed),
    );
    return NextResponse.json({ success: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

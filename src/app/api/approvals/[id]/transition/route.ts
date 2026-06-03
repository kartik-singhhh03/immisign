import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';
import type { ApprovalAction } from '@/features/approvals/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const action = body.action as ApprovalAction;
  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const approval = await service.transition(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
      action,
      {
        comment: body.comment,
        assigned_reviewer_id: body.assigned_reviewer_id,
        assigned_rma_id: body.assigned_rma_id,
      },
    );
    return NextResponse.json({ success: true, approval });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

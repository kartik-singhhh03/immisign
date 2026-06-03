import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const comment = await service.addComment(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
      body.content,
      {
        visibility: body.visibility,
        parent_id: body.parent_id,
        mentions: body.mentions,
      },
    );
    return NextResponse.json({ success: true, comment });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

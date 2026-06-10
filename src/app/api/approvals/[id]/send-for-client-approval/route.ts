import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';

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
    const result = await service.sendForClientApproval(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Send failed';
    console.error('[send-for-client-approval]', message, e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

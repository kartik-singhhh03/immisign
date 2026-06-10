import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';
import { ApprovalStatus } from '@/features/approvals/types';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/approvals', async () => {
  const ctx = await getApprovalApiContext(req.nextUrl.searchParams.get('agencyId') || undefined);
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }

  const sp = req.nextUrl.searchParams;
  const statusParam = sp.get('status');
  let status: ApprovalStatus | ApprovalStatus[] | undefined;
  if (statusParam) {
    status = statusParam.includes(',')
      ? (statusParam.split(',') as ApprovalStatus[])
      : (statusParam as ApprovalStatus);
  }

  const page = Number(sp.get('page') || 1);
  const limit = Number(sp.get('limit') || 20);

  const service = new ApprovalService(ctx.supabase);
  const result = await service.list(ctx.agencyId, ctx.dbRole, ctx.userId, {
    page,
    limit,
    search: sp.get('search') || undefined,
    status,
    agentId: sp.get('agentId') || undefined,
    reviewerId: sp.get('reviewerId') || undefined,
    matterTypeId: sp.get('matterTypeId') || undefined,
    priority: sp.get('priority') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
  });

  const count = result.count || 0;
  return NextResponse.json({
    success: true,
    ...result,
    page,
    limit,
    totalPages: count > 0 ? Math.ceil(count / limit) : 0,
  });
  });
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/approvals', async () => {
  const body = await req.json();
  const ctx = await getApprovalApiContext(body.agencyId);
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }
  if (ctx.agencyId !== body.agencyId) {
    return apiError('Agency mismatch', 403);
  }

  const service = new ApprovalService(ctx.supabase);
  const approval = await service.createApproval(ctx.agencyId, ctx.userId, ctx.dbRole, {
    client_id: body.client_id,
    title: body.title,
    visa_subclass: body.visa_subclass,
    matter_type_id: body.matter_type_id,
    matter_reference: body.matter_reference,
    priority: body.priority,
    notes: body.notes,
    internal_notes: body.internal_notes,
    lodgement_deadline: body.lodgement_deadline,
  });

  return NextResponse.json({ success: true, approval });
  });
}

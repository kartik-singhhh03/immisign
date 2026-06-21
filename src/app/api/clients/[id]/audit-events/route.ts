import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { DocumentAuditService } from '@/lib/audit/document-audit.service';
import { enrichApplicationApprovalAuditEvents } from '@/features/approvals/lib/application-approval-audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new DocumentAuditService(ctx.supabase);
  try {
    const events = await service.listForClient(ctx.agencyId, params.id);
    const enriched = await enrichApplicationApprovalAuditEvents(
      ctx.supabase,
      ctx.agencyId,
      params.id,
      events as Parameters<typeof enrichApplicationApprovalAuditEvents>[3],
    );
    return NextResponse.json({ success: true, events: enriched });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load audit events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

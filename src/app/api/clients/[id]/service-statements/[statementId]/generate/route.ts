import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; statementId: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ServiceStatementService(ctx.supabase);
  try {
    const statement = await service.generatePdf(
      ctx.agencyId,
      ctx.userId,
      params.id,
      params.statementId,
    );
    return NextResponse.json({ success: true, statement });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

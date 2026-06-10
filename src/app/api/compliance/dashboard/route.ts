import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ComplianceDashboardService } from '@/features/compliance/services/compliance-dashboard.service';

export async function GET() {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ComplianceDashboardService(ctx.supabase);
  try {
    const dashboard = await service.getDashboard(ctx.agencyId, ctx.agencySlug);
    return NextResponse.json({ success: true, dashboard });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Compliance dashboard failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

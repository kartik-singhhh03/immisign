import { NextResponse } from 'next/server';
import { requireAdminDebugAccess } from '@/lib/integrations/health/admin-guard';
import { runFullSystemHealth } from '@/lib/integrations/health/system-health';

export async function GET() {
  const ctx = await requireAdminDebugAccess();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const health = await runFullSystemHealth(ctx.agencyId);
  return NextResponse.json({
    ok: health.readiness.percentage >= 70,
    ...health,
    timestamp: new Date().toISOString(),
  });
}

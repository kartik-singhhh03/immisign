import { NextResponse } from 'next/server';
import { requireAdminDebugAccess } from '@/lib/integrations/health/admin-guard';
import { runSignwellDiagnostics } from '@/lib/integrations/health/signwell-diagnostics';

export async function GET() {
  const ctx = await requireAdminDebugAccess();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const diagnostics = await runSignwellDiagnostics();
  return NextResponse.json({
    ok: diagnostics.apiKeyValid,
    diagnostics,
    timestamp: new Date().toISOString(),
  });
}

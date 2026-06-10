import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminDebugAccess } from '@/lib/integrations/health/admin-guard';
import { runResendDiagnostics } from '@/lib/integrations/health/resend-diagnostics';
import { getEmailDeliveryStats } from '@/lib/email/delivery-audit';

export async function GET() {
  const ctx = await requireAdminDebugAccess();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createAdminClient();
  const diagnostics = await runResendDiagnostics(admin);
  const deliveryStats = await getEmailDeliveryStats();

  const domainPart = diagnostics.fromEmail.split('@')[1] || '';
  const matchedDomain = diagnostics.domains.find((d) => d.name === domainPart);

  const healthy =
    diagnostics.apiKeyPresent &&
    diagnostics.apiKeyValid &&
    diagnostics.domainVerified;

  return NextResponse.json({
    healthy,
    domain: matchedDomain?.name || domainPart || null,
    domainStatus: matchedDomain?.status || null,
    fromEmail: diagnostics.fromEmail,
    apiConnected: diagnostics.apiKeyValid,
    apiKeyPresent: diagnostics.apiKeyPresent,
    domains: diagnostics.domains,
    delivery: deliveryStats,
    timestamp: new Date().toISOString(),
  });
}

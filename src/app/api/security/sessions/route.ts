import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { getRequestMeta } from '@/lib/security/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withApiRoute('security.sessions', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const meta = getRequestMeta(req);
    const { data: sessionData } = await ctx.supabase.auth.getSession();
    const session = sessionData.session;

    const current = {
      id: session?.access_token?.slice(0, 12) || 'current',
      isCurrent: true,
      device: /Mobile/i.test(meta.userAgent || '') ? 'Mobile' : 'Desktop',
      browser: meta.userAgent?.includes('Chrome')
        ? 'Chrome'
        : meta.userAgent?.includes('Firefox')
          ? 'Firefox'
          : meta.userAgent?.includes('Safari')
            ? 'Safari'
            : 'Browser',
      ip: meta.ip,
      location: 'Approximate (IP-based)',
      lastActivity: new Date().toISOString(),
    };

    const { data: recentLogins } = await ctx.supabase
      .from('security_audit_logs')
      .select('ip_address, device_label, browser_label, created_at')
      .eq('user_id', ctx.userId)
      .eq('event_type', 'login.success')
      .order('created_at', { ascending: false })
      .limit(5);

    const historical =
      recentLogins?.map((row, i) => ({
        id: `log-${i}`,
        isCurrent: false,
        device: row.device_label || 'Unknown',
        browser: row.browser_label || 'Unknown',
        ip: row.ip_address,
        location: 'Approximate (IP-based)',
        lastActivity: row.created_at,
      })) || [];

    return apiJson({ sessions: [current, ...historical.filter((h) => h.ip !== current.ip)] });
  });
}

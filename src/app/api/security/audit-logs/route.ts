import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';

export async function GET(req: Request) {
  return withApiRoute('security.audit-logs', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);

    const { data, error } = await ctx.supabase
      .from('security_audit_logs')
      .select('id, event_type, ip_address, device_label, browser_label, metadata, created_at, user_id')
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === 'PGRST205') {
        return apiJson({ logs: [], warning: 'security_audit_logs table not deployed' });
      }
      return apiError(error.message, 500);
    }

    return apiJson({ logs: data || [] });
  });
}

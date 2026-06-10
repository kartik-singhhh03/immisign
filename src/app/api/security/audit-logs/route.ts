import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';

export async function GET(req: Request) {
  return withApiRoute('security.audit-logs', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit') || 20)), 100);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search')?.trim() || '';

    let query = ctx.supabase
      .from('security_audit_logs')
      .select('id, event_type, ip_address, device_label, browser_label, metadata, created_at, user_id', {
        count: 'exact',
      })
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`event_type.ilike.%${search}%,ip_address.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST205') {
        return apiJson({
          success: true,
          data: [],
          logs: [],
          count: 0,
          page,
          limit,
          totalPages: 0,
          warning: 'security_audit_logs table not deployed',
        });
      }
      return apiError(error.message, 500);
    }

    const total = count ?? 0;
    return apiJson({
      success: true,
      data: data || [],
      logs: data || [],
      count: total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    });
  });
}

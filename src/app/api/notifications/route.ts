import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/notifications', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') || 1));
    const limit = Math.min(50, Number(sp.get('limit') || 20));
    const offset = (page - 1) * limit;
    const type = sp.get('type');

    let query = ctx.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') query = query.eq('type', type);

    const { data, error, count } = await query;
    if (error) return apiError(error.message, 400);

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      page,
      limit,
    });
  });
}

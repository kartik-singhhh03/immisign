import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/activity', async () => {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') || 1));
  const limit = Math.min(50, Number(sp.get('limit') || 25));
  const offset = (page - 1) * limit;
  const search = sp.get('search')?.trim();
  const type = sp.get('type');

  let query = ctx.supabase
    .from('activity_logs')
    .select('*, users!activity_logs_user_id_fkey(full_name, email)', { count: 'exact' })
    .eq('agency_id', ctx.agencyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('type', type);
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    const fallback = await ctx.supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (fallback.error) {
      return apiError(fallback.error.message, 400);
    }
    return NextResponse.json({
      success: true,
      data: fallback.data || [],
      count: fallback.count || 0,
      page,
      limit,
    });
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    count: count || 0,
    page,
    limit,
  });
  });
}

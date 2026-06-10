import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/notifications/activity', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const sp = req.nextUrl.searchParams;
    const clientId = sp.get('client_id');
    const limit = Math.min(50, Number(sp.get('limit') || 30));

    let query = ctx.supabase
      .from('activity_events')
      .select('*')
      .eq('agency_id', ctx.agencyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query;
    if (error) return apiError(error.message, 400);

    return NextResponse.json({ success: true, data: data || [] });
  });
}

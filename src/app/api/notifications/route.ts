import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { listNotifications } from '@/lib/notifications/notification-query';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/notifications', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') || 1));
    const limit = Math.min(100, Number(sp.get('limit') || 30));
    const offset = (page - 1) * limit;

    const { data, error, count } = await listNotifications(ctx.supabase, {
      userId: ctx.userId,
      agencyId: ctx.agencyId,
      sidebar: sp.get('sidebar') || sp.get('filter') || undefined,
      scope: sp.get('scope') || undefined,
      priority: sp.get('priority') || undefined,
      inbox: sp.get('inbox') || undefined,
      includeArchived: sp.get('include_archived') === 'true',
      offset,
      limit,
      type: sp.get('type'),
    });

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

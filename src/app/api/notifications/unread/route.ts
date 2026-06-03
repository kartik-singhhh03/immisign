import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET() {
  return withApiRoute('GET /api/notifications/unread', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { count, error } = await ctx.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId)
      .eq('is_read', false);

    if (error) return apiError(error.message, 400);
    return NextResponse.json({ success: true, count: count || 0 });
  });
}

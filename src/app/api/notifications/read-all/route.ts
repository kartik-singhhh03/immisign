import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function POST() {
  return withApiRoute('POST /api/notifications/read-all', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { error } = await ctx.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId)
      .eq('is_read', false);

    if (error) return apiError(error.message, 400);
    return NextResponse.json({ success: true });
  });
}

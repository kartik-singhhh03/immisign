import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('PATCH /api/notifications/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ is_read: Boolean(body.is_read ?? true) })
      .eq('id', params.id)
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId);

    if (error) return apiError(error.message, 400);
    return NextResponse.json({ success: true });
  });
}

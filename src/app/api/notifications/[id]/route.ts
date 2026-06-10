import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('GET /api/notifications/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { data, error } = await ctx.supabase
      .from('notifications')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    if (error) return apiError(error.message, 400);
    if (!data) return apiError('not found', 404);

    const { data: events, error: activityError } = await ctx.supabase
      .from('activity_events')
      .select('*')
      .eq('notification_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      notification: data,
      activity: activityError ? [] : events || [],
    });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('PATCH /api/notifications/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if ('is_read' in body) patch.is_read = Boolean(body.is_read);
    if (body.archive) patch.archived_at = new Date().toISOString();
    if (body.unarchive) patch.archived_at = null;
    if (body.delete) patch.deleted_at = new Date().toISOString();

    const { error } = await ctx.supabase
      .from('notifications')
      .update(patch)
      .eq('id', params.id)
      .eq('user_id', ctx.userId)
      .eq('agency_id', ctx.agencyId);

    if (error) return apiError(error.message, 400);
    return NextResponse.json({ success: true });
  });
}

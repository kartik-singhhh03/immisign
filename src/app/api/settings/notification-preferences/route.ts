import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { DEFAULT_PREFERENCES } from '@/lib/notifications/types';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET() {
  return withApiRoute('GET /api/settings/notification-preferences', async () => {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }

  const { data } = await ctx.supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('agency_id', ctx.agencyId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    preferences: data || {
      user_id: ctx.userId,
      agency_id: ctx.agencyId,
      ...DEFAULT_PREFERENCES,
    },
  });
  });
}

export async function PATCH(req: NextRequest) {
  return withApiRoute('PATCH /api/settings/notification-preferences', async () => {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }

  const body = await req.json();
  const row = {
    user_id: ctx.userId,
    agency_id: ctx.agencyId,
    ...DEFAULT_PREFERENCES,
    ...body,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.supabase
    .from('user_notification_preferences')
    .upsert(row, { onConflict: 'user_id,agency_id' })
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return NextResponse.json({ success: true, preferences: data });
  });
}

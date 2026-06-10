import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { isMissingColumnError } from '@/lib/notifications/notification-query';

type BulkAction = 'read' | 'unread' | 'archive' | 'delete';

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/notifications/bulk', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const action = body.action as BulkAction;

    if (!ids.length || !action) {
      return apiError('ids and action required', 400);
    }

    const now = new Date().toISOString();
    let patch: Record<string, unknown> = {};

    switch (action) {
      case 'read':
        patch = { is_read: true };
        break;
      case 'unread':
        patch = { is_read: false };
        break;
      case 'archive':
        patch = { archived_at: now, is_read: true };
        break;
      case 'delete':
        patch = { deleted_at: now };
        break;
      default:
        return apiError('invalid action', 400);
    }

    const run = (p: Record<string, unknown>) =>
      ctx.supabase
        .from('notifications')
        .update(p)
        .in('id', ids)
        .eq('user_id', ctx.userId)
        .eq('agency_id', ctx.agencyId);

    let { error } = await run(patch);
    if (error && isMissingColumnError(error.message) && (action === 'archive' || action === 'delete')) {
      const fallback =
        action === 'archive' ? { is_read: true } : { is_read: true };
      ({ error } = await run(fallback));
    }

    if (error) return apiError(error.message, 400);
    return NextResponse.json({ success: true, updated: ids.length });
  });
}

import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';

export async function POST(req: Request) {
  return withApiRoute('security.login-event', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { eventType } = await req.json();
    const allowed = ['login.success', 'logout'];
    if (!allowed.includes(eventType)) return apiError('Invalid event type', 400);

    const meta = getRequestMeta(req);
    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: eventType as 'login.success' | 'logout',
      ...meta,
    });

    return apiJson({ logged: true });
  });
}

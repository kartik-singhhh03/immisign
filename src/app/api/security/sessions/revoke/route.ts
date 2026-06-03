import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';

export async function POST(req: Request) {
  return withApiRoute('security.sessions.revoke', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { scope } = await req.json();
    const meta = getRequestMeta(req);

    if (scope === 'all') {
      const { error } = await ctx.supabase.auth.signOut({ scope: 'global' });
      if (error) return apiError(error.message, 400);
      await logSecurityEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        userId: ctx.userId,
        eventType: 'session.revoked_all',
        ...meta,
      });
      return apiJson({ revoked: true, scope: 'all' });
    }

    const { error } = await ctx.supabase.auth.signOut({ scope: 'local' });
    if (error) return apiError(error.message, 400);
    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: 'session.revoked',
      ...meta,
    });
    return apiJson({ revoked: true, scope: 'current' });
  });
}

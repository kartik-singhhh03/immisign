import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { validatePassword } from '@/lib/auth/password-policy';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';

export async function POST(req: Request) {
  return withApiRoute('security.password', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return apiError('Current and new password are required', 400);
    }

    const policy = validatePassword(newPassword);
    if (!policy.valid) return apiError(policy.errors.join(' '), 400);

    const email = ctx.profile.email as string;
    const signIn = await ctx.supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signIn.error) return apiError('Current password is incorrect', 401);

    const { error } = await ctx.supabase.auth.updateUser({ password: newPassword });
    if (error) return apiError(error.message, 400);

    const meta = getRequestMeta(req);
    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: 'password.change',
      ...meta,
    });

    return apiJson({ updated: true });
  });
}

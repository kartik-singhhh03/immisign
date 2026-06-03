import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';
import { isMfaMandatoryForRole } from '@/lib/security/mfa-policy';

export async function POST(req: Request) {
  return withApiRoute('security.mfa.disable', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    if (isMfaMandatoryForRole(ctx.dbRole)) {
      return apiError('MFA is mandatory for your role and cannot be disabled.', 403);
    }

    const { factorId } = await req.json();
    if (!factorId) return apiError('factorId is required', 400);

    const { error } = await ctx.supabase.auth.mfa.unenroll({ factorId });
    if (error) return apiError(error.message, 400);

    await ctx.supabase
      .from('users')
      .update({ mfa_enabled: false, mfa_recovery_codes: null })
      .eq('id', ctx.userId);

    const meta = getRequestMeta(req);
    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: 'mfa.disabled',
      ...meta,
    });

    return apiJson({ disabled: true });
  });
}

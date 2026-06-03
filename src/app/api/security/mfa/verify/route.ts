import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';
import { randomBytes } from 'crypto';

function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})/g, '$1-').slice(0, 9),
  );
}

export async function POST(req: Request) {
  return withApiRoute('security.mfa.verify', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { factorId, code } = await req.json();
    if (!factorId || !code) return apiError('factorId and code are required', 400);

    const challenge = await ctx.supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) return apiError(challenge.error.message, 400);

    const verify = await ctx.supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: String(code).trim(),
    });
    if (verify.error) return apiError(verify.error.message, 400);

    const recoveryCodes = generateRecoveryCodes();
    const meta = getRequestMeta(req);
    await ctx.supabase
      .from('users')
      .update({
        mfa_enabled: true,
        mfa_enrolled_at: new Date().toISOString(),
        mfa_recovery_codes: recoveryCodes,
      })
      .eq('id', ctx.userId);

    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: 'mfa.enabled',
      ...meta,
    });

    return apiJson({ enrolled: true, recoveryCodes });
  });
}

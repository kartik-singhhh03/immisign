import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { isMfaMandatoryForRole } from '@/lib/security/mfa-policy';

export async function GET() {
  return withApiRoute('security.mfa.status', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { data: factors, error: factorError } = await ctx.supabase.auth.mfa.listFactors();
    if (factorError) return apiError(factorError.message, 400);

    const totp = factors?.totp || [];
    const verified = totp.filter((f) => f.status === 'verified');
    const { data: profile } = await ctx.supabase
      .from('users')
      .select('mfa_enabled, mfa_enrolled_at, role')
      .eq('id', ctx.userId)
      .single();

    return apiJson({
      enrolled: verified.length > 0 || Boolean(profile?.mfa_enabled),
      mandatory: isMfaMandatoryForRole(ctx.dbRole),
      factors: totp,
      recoveryCodesConfigured: Boolean(
        profile && (profile as { mfa_recovery_codes?: unknown }).mfa_recovery_codes,
      ),
    });
  });
}

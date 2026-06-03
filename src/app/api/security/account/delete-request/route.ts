import { apiError, apiJson, withApiRoute } from '@/lib/api/json-response';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  return withApiRoute('security.account.delete-request', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const { password, confirmText, mfaCode, factorId } = await req.json();
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return apiError('Type DELETE MY ACCOUNT to confirm.', 400);
    }
    if (!password) return apiError('Password confirmation is required', 400);

    const email = ctx.profile.email as string;
    const signIn = await ctx.supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) return apiError('Password confirmation failed', 401);

    const { data: userRow } = await ctx.supabase
      .from('users')
      .select('mfa_enabled, role')
      .eq('id', ctx.userId)
      .single();

    if (userRow?.mfa_enabled) {
      if (!factorId || !mfaCode) {
        return apiError('MFA verification required', 400);
      }
      const challenge = await ctx.supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) return apiError(challenge.error.message, 400);
      const verify = await ctx.supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: String(mfaCode).trim(),
      });
      if (verify.error) return apiError('Invalid MFA code', 401);
    }

    if (ctx.dbRole === 'owner') {
      const admin = createAdminClient();
      const agencyId = ctx.agencyId;

      const [{ count: userCount }, { count: agreementCount }, { count: approvalCount }] =
        await Promise.all([
          admin.from('users').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
          admin
            .from('agreements')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agencyId)
            .not('status', 'in', '("cancelled","expired")'),
          admin
            .from('application_approvals')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agencyId)
            .is('deleted_at', null)
            .in('status', ['draft', 'pending', 'in_review', 'awaiting_client']),
        ]);

      if ((userCount || 0) > 1) {
        return apiError('Transfer ownership or remove other users before deleting your account.', 409);
      }
      if ((agreementCount || 0) > 0) {
        return apiError('Cancel or complete active agreements before account deletion.', 409);
      }
      if ((approvalCount || 0) > 0) {
        return apiError('Resolve pending application approvals before account deletion.', 409);
      }

      const { data: agency } = await admin
        .from('agencies')
        .select('subscription_status')
        .eq('id', agencyId)
        .single();
      const subStatus = (agency as { subscription_status?: string } | null)?.subscription_status;
      if (subStatus === 'active' || subStatus === 'trialing') {
        return apiError('Cancel your subscription before deleting the owner account.', 409);
      }
    }

    const meta = getRequestMeta(req);
    await ctx.supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', ctx.userId);

    await logSecurityEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      eventType: 'account.deletion_requested',
      ...meta,
      metadata: { role: ctx.dbRole },
    });

    await ctx.supabase.auth.signOut({ scope: 'global' });

    return apiJson({ requested: true, softDeleted: true });
  });
}

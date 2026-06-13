import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withApiRoute('GET /api/agreements/widgets', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const [draftRes, sentRes, awaitingRes, signedRes] = await Promise.all([
      ctx.supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .in('status', ['draft']),
      ctx.supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .not('sent_at', 'is', null),
      ctx.supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .in('status', ['sent', 'pending', 'viewed', 'awaiting_signature']),
      ctx.supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .eq('status', 'signed'),
    ]);

    return NextResponse.json({
      success: true,
      widgets: {
        pending: draftRes.count || 0,
        sent: sentRes.count || 0,
        awaitingSignature: awaitingRes.count || 0,
        signed: signedRes.count || 0,
      },
    });
  });
}

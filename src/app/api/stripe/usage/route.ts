// @ts-nocheck
// @ts-nocheck
import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { handleServerError } from '@/lib/utils/errors';

export async function GET() {
  try {
    const { agency } = await requireAgency();
    const supabase = await createClient();

    // 1. Fetch Subscription details
    const { data: sub } = await supabase
       .from('subscriptions')
       .select('stripe_price_id, plan_name, status, current_period_end, cancel_at_period_end')
       .eq('agency_id', agency.id)
       .single();

    // 2. Aggregate Live Usage Metics safely across the tenant vault
    // Number of active users natively querying
    const { count: userCount } = await supabase
       .from('users')
       .select('*', { count: 'exact', head: true })
       .eq('agency_id', agency.id)
       .eq('is_active', true);

    // Number of agreements tracking 30d rolling windows ideally, doing lifetime here to keep it uniform
    const { count: docsCount } = await supabase
       .from('agreements')
       .select('*', { count: 'exact', head: true })
       .eq('agency_id', agency.id);

    return NextResponse.json({
        plan: sub?.plan_name || 'STARTER',
        status: sub?.status || 'trialing',
        current_period_end: sub?.current_period_end,
        cancel_at: sub?.cancel_at_period_end,
        limits: {
            max_users: agency.max_users,
            max_documents: agency.max_documents
        },
        usage: {
            active_users: userCount || 0,
            documents_used: docsCount || 0
        }
    });

  } catch (err: any) {
    const safeError = handleServerError(err);
    return NextResponse.json(safeError, { status: 500 });
  }
}


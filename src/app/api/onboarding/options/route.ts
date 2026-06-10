import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ASSIGNABLE_AGENT_ROLES, agentRoleLabel } from '@/features/onboarding/lib/assignable-agents';

export async function GET() {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const [matterTypes, agents, defaults] = await Promise.all([
    ctx.supabase
      .from('matter_types')
      .select('id, name, subclass_placeholder, show_secondary_applicant')
      .eq('agency_id', ctx.agencyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    ctx.supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', ctx.agencyId)
      .in('role', [...ASSIGNABLE_AGENT_ROLES]),
    ctx.supabase
      .from('matter_defaults')
      .select('card_processing_surcharge_percent')
      .eq('agency_id', ctx.agencyId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    success: true,
    matterTypes: matterTypes.data || [],
    agents: (agents.data || []).map((a) => ({
      id: a.id,
      name: a.full_name || a.email,
      email: a.email,
      role: a.role,
      roleLabel: agentRoleLabel(a.role || ''),
    })),
    surchargePercent: defaults.data?.card_processing_surcharge_percent ?? null,
  });
}

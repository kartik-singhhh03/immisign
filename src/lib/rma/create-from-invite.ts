import type { SupabaseClient } from '@supabase/supabase-js';

type InviteRow = {
  agency_id: string;
  email: string;
  role?: string;
  marn?: string | null;
  full_name?: string | null;
};

export async function createRmaFromInvite(
  admin: SupabaseClient,
  userId: string,
  invite: InviteRow,
  phone?: string | null
) {
  const maraNumber = (invite.marn || '').trim();
  if (!maraNumber) return;

  const agentRoles = ['owner', 'migration_agent', 'agent', 'admin'];
  if (invite.role && !agentRoles.includes(invite.role)) return;

  const { count } = await admin
    .from('rmas')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', invite.agency_id);

  const isFirst = (count ?? 0) === 0;

  const { data: existing } = await admin
    .from('rmas')
    .select('id')
    .eq('agency_id', invite.agency_id)
    .eq('user_id', userId)
    .maybeSingle();

  const payload = {
    agency_id: invite.agency_id,
    user_id: userId,
    mara_number: maraNumber,
    phone: phone || null,
    rma_status: 'active',
    rma_tier: invite.role === 'owner' ? 'default' : 'associate',
    updated_at: new Date().toISOString(),
  };

  if (phone) {
    await admin.from('users').update({ phone, updated_at: new Date().toISOString() }).eq('id', userId);
  }

  if (existing?.id) {
    await admin.from('rmas').update(payload).eq('id', existing.id);
    return;
  }

  await admin.from('rmas').insert({
    ...payload,
    is_default: isFirst,
  });
}

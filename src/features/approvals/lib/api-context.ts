import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { dbRoleToUi, type DbRole } from '@/lib/auth/db-roles';

export async function getApprovalApiContext(agencyId?: string) {
  let supabase = await createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const authHeader = headers().get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const raw = createRawClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: { user: tokenUser } } = await raw.auth.getUser();
      if (tokenUser) {
        supabase = raw as Awaited<ReturnType<typeof createClient>>;
        user = tokenUser;
      }
    }
  }

  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, agency_id, role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.agency_id) {
    return { error: 'Agency context required', status: 403 };
  }

  if (agencyId && profile.agency_id !== agencyId) {
    return { error: 'Agency mismatch', status: 403 };
  }

  const dbRole = profile.role as DbRole;
  return {
    supabase,
    userId: profile.id as string,
    agencyId: profile.agency_id as string,
    dbRole,
    uiRole: dbRoleToUi(dbRole),
    profile,
  };
}

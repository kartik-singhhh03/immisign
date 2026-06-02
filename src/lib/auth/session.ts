import { createClient } from '@/lib/supabase/server';
import { dbRoleToUi, type DbRole } from './db-roles';

export type SessionProfile = {
  id: string;
  email: string;
  full_name: string;
  agency_id: string;
  dbRole: DbRole;
  uiRole: ReturnType<typeof dbRoleToUi>;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, agency_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.agency_id) return null;
  if (
    profile.agency_id === '11111111-1111-1111-1111-111111111111' ||
    profile.agency_id === '00000000-0000-0000-0000-000000000000'
  ) {
    console.error('[SESSION_PROFILE_INVALID_AGENCY_ID]', profile);
    return null;
  }

  const dbRole = profile.role as DbRole;
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    agency_id: profile.agency_id,
    dbRole,
    uiRole: dbRoleToUi(dbRole),
  };
}

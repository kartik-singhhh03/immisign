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

  const { data: profile, error: profileError } = await (supabase as any)
    .from('users')
    .select('id, email, full_name, agency_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.agency_id) return null;

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

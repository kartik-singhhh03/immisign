import { createClient } from '../server';
import { Database } from '@/types/database';

type Role = Database['public']['Enums']['user_role'];

export async function updateTeamMemberRole(id: string, role: Role) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('users') as any)
    .update({ role } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeTeamMember(id: string) {
  const supabase = await createClient();
  // Simply remove them from the agency
  const { error } = await (supabase.from('users') as any)
    .update({ agency_id: null } as any)
    .eq('id', id);

  if (error) throw error;
}

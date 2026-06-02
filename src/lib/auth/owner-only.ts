import { createClient } from '@/lib/supabase/server';

export async function requireOwnerSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, error: 'Profile not found' };
  }

  if (profile.role !== 'owner') {
    return { ok: false as const, status: 403, error: 'Owner role required' };
  }

  return { ok: true as const, user, profile };
}

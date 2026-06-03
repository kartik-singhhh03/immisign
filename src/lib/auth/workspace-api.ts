import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import type { DbRole } from '@/lib/auth/db-roles';

export async function getWorkspaceApiContext() {
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

  const { data: profile } = await supabase
    .from('users')
    .select('id, agency_id, role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile?.agency_id) return { error: 'No agency', status: 403 };

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug, name')
    .eq('id', profile.agency_id)
    .single();

  return {
    supabase,
    userId: profile.id as string,
    agencyId: profile.agency_id as string,
    agencySlug: agency?.slug as string,
    agencyName: agency?.name as string,
    dbRole: profile.role as DbRole,
    profile,
  };
}

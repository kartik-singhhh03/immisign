import { createClient } from './server';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('users')
    .select('*, agency:agencies(*)')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

export async function getCurrentAgency() {
  const profile = await getCurrentProfile();
  
  if (!profile || !profile.agency_id) {
    return null;
  }

  return typeof profile.agency === 'object' && profile.agency !== null 
    ? (Array.isArray(profile.agency) ? profile.agency[0] : profile.agency) 
    : null;
}

/**
 * Page / Server Component auth only.
 * Route Handlers must use `getWorkspaceApiContext()` — `redirect()` becomes a 500 in APIs.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/** @see requireAuth — not for Route Handlers */
export async function requireAgency() {
  await requireAuth();
  const profile = await getCurrentProfile();
  
  if (!profile || !profile.agency_id) {
    redirect('/onboarding');
  }
  
  const agency = typeof profile.agency === 'object' && profile.agency !== null 
    ? Array.isArray(profile.agency) ? profile.agency[0] : profile.agency 
    : null;
    
  if (!agency) {
    redirect('/onboarding');
  }
  
  return { profile, agency };
}

export async function requireRole(allowedRoles: string[]) {
  const { profile, agency } = await requireAgency();
  
  if (!profile.role || !allowedRoles.includes(profile.role)) {
    redirect('/dashboard');
  }
  
  return { profile, agency };
}

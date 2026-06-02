import { createClient } from './server';
import { redirect } from 'next/navigation';
import { isSafeDevMode } from '../config';

const mockUser = {
  id: "u-owner",
  email: "owner@demoagency.com",
  user_metadata: { name: "Rajwant Singh" }
};

const mockAgency = {
  id: "w-avc",
  name: "AVC Migration",
  slug: "avc-migration",
  initials: "AM",
  color: "#0D9F8C",
  address: "Level 14, 175 Pitt Street, Sydney NSW 2000",
  marn: "1794016",
  abn: "45 128 349 820"
};

const mockProfile = {
  id: "u-owner",
  name: "Rajwant Singh",
  email: "owner@demoagency.com",
  role: "owner",
  agency_id: "w-avc",
  agency: mockAgency
};

function isPlaceholderAgencyId(value?: string | null) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return (
    normalized === '11111111-1111-1111-1111-111111111111' ||
    normalized === '00000000-0000-0000-0000-000000000000'
  );
}

export async function getCurrentUser() {
  if (isSafeDevMode) {
    return mockUser as any;
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function getCurrentProfile() {
  if (isSafeDevMode) {
    return mockProfile as any;
  }

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('users')
    .select('*, agency:agencies(*)')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;
  if (isPlaceholderAgencyId((profile as any).agency_id)) {
    console.error('[AUTH_PROFILE_INVALID_AGENCY]', profile);
    return null;
  }
  return profile;
}

export async function getCurrentAgency() {
  if (isSafeDevMode) {
    return mockAgency as any;
  }

  const profile = await getCurrentProfile();
  
  if (!profile || !profile.agency_id) {
    return null;
  }

  // Due to RLS, this could also just be fetched, but since profile joined it, we return from join or fetch again.
  return typeof profile.agency === 'object' && profile.agency !== null 
    ? (Array.isArray(profile.agency) ? profile.agency[0] : profile.agency) 
    : null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireAgency() {
  await requireAuth();
  const profile = await getCurrentProfile();
  
  if (!profile || !profile.agency_id) {
    redirect('/onboarding'); // Redirect to create or join an agency
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
    redirect('/dashboard'); // or standard unauthorized error page
  }
  
  return { profile, agency };
}

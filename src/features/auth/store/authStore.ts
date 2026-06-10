import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  agency_id?: string;
  role:
    | "Owner"
    | "Admin"
    | "Migration Agent"
    | "Case Manager"
    | "Assistant"
    | "Read-only staff";
  marn?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  initials: string;
  color: string;
  logoUrl?: string;
  address: string;
  marn: string;
  abn: string;
  team: Array<{
    name: string;
    email: string;
    role: string;
    marn: string;
    status: string;
  }>;
}

export interface OnboardingData {
  agencyName: string;
  slug: string;
  primaryColor: string;
  logoText: string;
  specialty: string;
  teamSize: string;
  invitedStaff: Array<{
    name: string;
    email: string;
    role: string;
    marn: string;
  }>;
  selectedTemplates: string[];
}

export interface AuthState {
  user: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  onboardingStep: number;
  onboardingData: OnboardingData;

  // Actions
  login: (email: string, targetSlug?: string) => boolean;
  logout: () => void;
  switchWorkspace: (slug: string) => void;
  updateWorkspaceBranding: (color: string, initials: string, logoUrl?: string) => void;
  updateOnboardingStep: (step: number) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  invitePractitioner: (
    name: string,
    email: string,
    role: string,
    marn: string,
  ) => Promise<{ inviteUrl?: string }>;
  setAuthState: (state: Partial<AuthState>) => void;
}

const initialWorkspaces: Workspace[] = [];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeWorkspace: null,
  workspaces: initialWorkspaces,
  onboardingStep: 1,
  onboardingData: {
    agencyName: "",
    slug: "",
    primaryColor: "#3E7C6B",
    logoText: "",
    specialty: "skilled",
    teamSize: "1",
    invitedStaff: [],
    selectedTemplates: ["SC-189-RETAINER", "SC-820-RETAINER"],
  },

  setAuthState: (state: Partial<AuthState>) => {
    set(state);
  },

  login: (email: string, targetSlug?: string) => {
    // This is now purely a placeholder for backward compatibility
    // if any component calls it directly without Supabase.
    // The real login should happen via Supabase signInWithPassword.
    return true;
  },

  logout: () => {
    set({
      user: null,
      activeWorkspace: null,
    });
  },

  switchWorkspace: (slug: string) => {
    const matchedWorkspace = get().workspaces.find((w) => w.slug === slug);
    if (!matchedWorkspace) {
      return;
    }
    set({ activeWorkspace: matchedWorkspace });
  },

  updateWorkspaceBranding: (color: string, initials: string, logoUrl?: string) => {
    const { activeWorkspace, workspaces } = get();
    if (!activeWorkspace) return;

    const updatedWorkspace = {
      ...activeWorkspace,
      color,
      initials,
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || undefined } : {}),
    };

    const updatedList = workspaces.map((w) =>
      w.slug === activeWorkspace.slug ? updatedWorkspace : w,
    );
    set({
      activeWorkspace: updatedWorkspace,
      workspaces: updatedList,
    });
  },

  updateOnboardingStep: (step: number) => {
    set({ onboardingStep: step });
  },

  updateOnboardingData: (data: Partial<OnboardingData>) => {
    set({
      onboardingData: {
        ...get().onboardingData,
        ...data,
      },
    });
  },

  invitePractitioner: async (name, email, role, marn) => {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, marn }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invitation failed');
    }
    return { inviteUrl: data.inviteUrl as string | undefined };
  },
}));

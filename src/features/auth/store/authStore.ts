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
  updateWorkspaceBranding: (color: string, initials: string) => void;
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

// Seed Workspaces
const initialWorkspaces: Workspace[] = [
  {
    id: "w-avc",
    name: "AVC Migration",
    slug: "avc-migration",
    initials: "AM",
    color: "#0D9F8C", // Emerald
    address: "Level 14, 175 Pitt Street, Sydney NSW 2000",
    marn: "1794016",
    abn: "45 128 349 820",
    team: [
      {
        name: "Rajwant Singh",
        role: "Principal RMA",
        marn: "MARN 1794016",
        status: "Active",
        email: "rajwant@avcmigration.com.au",
      },
      {
        name: "Priya Mehta",
        role: "Registered Migration Agent",
        marn: "MARN 2189402",
        status: "Active",
        email: "priya@avcmigration.com.au",
      },
      {
        name: "Aman Gill",
        role: "Visa Case Administrator",
        marn: "N/A",
        status: "Active",
        email: "aman@avcmigration.com.au",
      },
    ],
  },
  {
    id: "w-gvp",
    name: "Global Visa Partners",
    slug: "global-visa",
    initials: "GVP",
    color: "#2563EB", // Sapphire Blue
    address: "Level 8, 350 Collins Street, Melbourne VIC 3000",
    marn: "2088410",
    abn: "19 402 388 410",
    team: [
      {
        name: "Sarah Jenkins",
        role: "Director & Lead Agent",
        marn: "MARN 2088410",
        status: "Active",
        email: "sarah@globalvisa.com.au",
      },
      {
        name: "Harpreet Kaur",
        role: "Migration Advisor",
        marn: "MARN 2344102",
        status: "Active",
        email: "harpreet@globalvisa.com.au",
      },
      {
        name: "Liam O'Connor",
        role: "Assistant Officer",
        marn: "N/A",
        status: "Active",
        email: "liam@globalvisa.com.au",
      },
    ],
  },
  {
    id: "w-smg",
    name: "Sydney Migration Group",
    slug: "sydney-migration",
    initials: "SMG",
    color: "#D97706", // Amber Gold
    address: "Suite 4B, 333 George Street, Sydney NSW 2000",
    marn: "1689104",
    abn: "34 918 168 104",
    team: [
      {
        name: "Marcus Zhao",
        role: "Senior Consultant",
        marn: "MARN 1689104",
        status: "Active",
        email: "marcus@sydneymigration.com.au",
      },
      {
        name: "Elena Rostova",
        role: "Case Officer",
        marn: "N/A",
        status: "Active",
        email: "elena@sydneymigration.com.au",
      },
    ],
  },
];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeWorkspace: null,
  workspaces: initialWorkspaces,
  onboardingStep: 1,
  onboardingData: {
    agencyName: "",
    slug: "",
    primaryColor: "#0D9F8C",
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
    let matchedWorkspace = get().workspaces.find((w) => w.slug === slug);
    if (!matchedWorkspace) {
      // Dynamic fallback for generated test tenants
      matchedWorkspace = {
        id: `w-${Date.now()}`,
        name: "Valid Cloud Agency",
        slug: slug,
        initials: "VA",
        color: "#0D9F8C",
        address: "E2E Test Environment",
        marn: "1234567",
        abn: "00 000 000 000",
        team: [],
      };
      set({ workspaces: [...get().workspaces, matchedWorkspace] });
    }
    set({ activeWorkspace: matchedWorkspace });
  },

  updateWorkspaceBranding: (color: string, initials: string) => {
    const { activeWorkspace, workspaces } = get();
    if (!activeWorkspace) return;

    const updatedWorkspace = {
      ...activeWorkspace,
      color,
      initials,
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

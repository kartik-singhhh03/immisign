import { create } from "zustand"

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: "Owner" | "Admin" | "Migration Agent" | "Case Manager" | "Assistant" | "Read-only staff"
  marn?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  initials: string
  color: string
  address: string
  marn: string
  abn: string
  team: Array<{
    name: string
    email: string
    role: string
    marn: string
    status: string
  }>
}

export interface OnboardingData {
  agencyName: string
  slug: string
  primaryColor: string
  logoText: string
  specialty: string
  teamSize: string
  invitedStaff: Array<{ name: string; email: string; role: string; marn: string }>
  selectedTemplates: string[]
}

export interface AuthState {
  user: User | null
  activeWorkspace: Workspace | null
  simulatedRole: User["role"] | null
  workspaces: Workspace[]
  onboardingStep: number
  onboardingData: OnboardingData
  
  // Actions
  login: (email: string, targetSlug?: string) => boolean
  logout: () => void
  switchWorkspace: (slug: string) => void
  switchRole: (role: User["role"]) => void
  updateWorkspaceBranding: (color: string, initials: string) => void
  updateOnboardingStep: (step: number) => void
  updateOnboardingData: (data: Partial<OnboardingData>) => void
  invitePractitioner: (name: string, email: string, role: string, marn: string) => void
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
      { name: "Rajwant Singh", role: "Principal RMA", marn: "MARN 1794016", status: "Active", email: "rajwant@avcmigration.com.au" },
      { name: "Priya Mehta", role: "Registered Migration Agent", marn: "MARN 2189402", status: "Active", email: "priya@avcmigration.com.au" },
      { name: "Aman Gill", role: "Visa Case Administrator", marn: "N/A", status: "Active", email: "aman@avcmigration.com.au" },
    ]
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
      { name: "Sarah Jenkins", role: "Director & Lead Agent", marn: "MARN 2088410", status: "Active", email: "sarah@globalvisa.com.au" },
      { name: "Harpreet Kaur", role: "Migration Advisor", marn: "MARN 2344102", status: "Active", email: "harpreet@globalvisa.com.au" },
      { name: "Liam O'Connor", role: "Assistant Officer", marn: "N/A", status: "Active", email: "liam@globalvisa.com.au" },
    ]
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
      { name: "Marcus Zhao", role: "Senior Consultant", marn: "MARN 1689104", status: "Active", email: "marcus@sydneymigration.com.au" },
      { name: "Elena Rostova", role: "Case Officer", marn: "N/A", status: "Active", email: "elena@sydneymigration.com.au" },
    ]
  }
]

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeWorkspace: null,
  simulatedRole: null,
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
    selectedTemplates: ["SC-189-RETAINER", "SC-820-RETAINER"]
  },

  login: (email: string, targetSlug?: string) => {
    // Determine the user's role and target workspace based on their demo email or domain
    const cleanEmail = email.toLowerCase().trim()
    let mappedUser: User | null = null
    let targetWorkspaceSlug = targetSlug || "avc-migration"

    if (cleanEmail === "owner@demoagency.com" || cleanEmail === "rajwant@avcmigration.com.au") {
      mappedUser = {
        id: "u-owner",
        name: "Rajwant Singh",
        email: cleanEmail,
        avatar: "RS",
        role: "Owner",
        marn: "1794016"
      }
      targetWorkspaceSlug = "avc-migration"
    } else if (cleanEmail === "agent@demoagency.com" || cleanEmail === "priya@avcmigration.com.au") {
      mappedUser = {
        id: "u-agent",
        name: "Priya Mehta",
        email: cleanEmail,
        avatar: "PM",
        role: "Migration Agent",
        marn: "2189402"
      }
      targetWorkspaceSlug = "avc-migration"
    } else if (cleanEmail === "manager@demoagency.com" || cleanEmail === "sarah@globalvisa.com.au") {
      mappedUser = {
        id: "u-manager",
        name: "Sarah Jenkins",
        email: cleanEmail,
        avatar: "SJ",
        role: "Case Manager",
        marn: "2088410"
      }
      targetWorkspaceSlug = "global-visa"
    } else if (cleanEmail === "assistant@demoagency.com" || cleanEmail === "aman@avcmigration.com.au") {
      mappedUser = {
        id: "u-assistant",
        name: "Aman Gill",
        email: cleanEmail,
        avatar: "AG",
        role: "Assistant"
      }
      targetWorkspaceSlug = "avc-migration"
    } else {
      // Default fallback login for custom email
      const workspaceName = cleanEmail.includes("@") ? cleanEmail.split("@")[1].split(".")[0].toUpperCase() + " MIGRATION" : "CUSTOM AGENCY"
      const userInitials = cleanEmail.substring(0, 2).toUpperCase()
      
      mappedUser = {
        id: "u-custom",
        name: cleanEmail.split("@")[0].toUpperCase() || "Practitioner",
        email: cleanEmail,
        avatar: userInitials,
        role: "Owner"
      }

      // Check if user is logging into their custom dynamic onboarding workspace
      const currentWorkspaces = get().workspaces
      const customExists = currentWorkspaces.find(w => w.slug === targetWorkspaceSlug)
      if (!customExists) {
        const customWorkspace: Workspace = {
          id: `w-${Date.now()}`,
          name: workspaceName,
          slug: targetWorkspaceSlug,
          initials: userInitials,
          color: "#0D9F8C",
          address: "Sydney Office Suite 12",
          marn: "1234567",
          abn: "12 345 678 910",
          team: [{ name: mappedUser.name, role: "Principal RMA", marn: "MARN 1234567", status: "Active", email: cleanEmail }]
        }
        set({ workspaces: [...currentWorkspaces, customWorkspace] })
      }
    }

    const matchedWorkspace = get().workspaces.find(w => w.slug === targetWorkspaceSlug) || get().workspaces[0]

    set({
      user: mappedUser,
      activeWorkspace: matchedWorkspace,
      simulatedRole: mappedUser?.role || "Owner"
    })
    return true
  },

  logout: () => {
    set({
      user: null,
      activeWorkspace: null,
      simulatedRole: null
    })
  },

  switchWorkspace: (slug: string) => {
    const matchedWorkspace = get().workspaces.find(w => w.slug === slug)
    if (matchedWorkspace) {
      set({ activeWorkspace: matchedWorkspace })
    }
  },

  switchRole: (role: User["role"]) => {
    set({ simulatedRole: role })
  },

  updateWorkspaceBranding: (color: string, initials: string) => {
    const { activeWorkspace, workspaces } = get()
    if (!activeWorkspace) return

    const updatedWorkspace = {
      ...activeWorkspace,
      color,
      initials
    }

    const updatedList = workspaces.map(w => w.slug === activeWorkspace.slug ? updatedWorkspace : w)
    set({
      activeWorkspace: updatedWorkspace,
      workspaces: updatedList
    })
  },

  updateOnboardingStep: (step: number) => {
    set({ onboardingStep: step })
  },

  updateOnboardingData: (data: Partial<OnboardingData>) => {
    set({
      onboardingData: {
        ...get().onboardingData,
        ...data
      }
    })
  },

  invitePractitioner: (name: string, email: string, role: string, marn: string) => {
    const { activeWorkspace, workspaces } = get()
    if (!activeWorkspace) return

    const newTeamMember = {
      name,
      email,
      role,
      marn: marn ? `MARN ${marn}` : "N/A",
      status: "Active"
    }

    const updatedWorkspace = {
      ...activeWorkspace,
      team: [...activeWorkspace.team, newTeamMember]
    }

    const updatedList = workspaces.map(w => w.slug === activeWorkspace.slug ? updatedWorkspace : w)
    set({
      activeWorkspace: updatedWorkspace,
      workspaces: updatedList
    })
  }
}))

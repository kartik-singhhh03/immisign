"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore, type User } from "@/store/authStore"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), [])
  const setAuthState = useAuthStore((state) => state.setAuthState)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const fetchProfileAndWorkspace = async (userId: string) => {
      console.log("[AuthProvider] fetchProfileAndWorkspace starting for user ID:", userId);
      try {
        // 1. Fetch user profile
        console.log("[AuthProvider] Executing users query...");
        const usersPromise = (supabase as any)
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        console.log("[AuthProvider] usersPromise created, awaiting...");
        const { data: profile, error: profileError } = await usersPromise;
        console.log("[AuthProvider] usersQuery finished. profile:", !!profile, "error:", profileError?.message || null);
        
        if (profileError || !profile) {
          console.error("[AuthProvider] Profile error details:", profileError);
          throw profileError;
        }

        // 2. Fetch agency/workspace
        const { data: agency, error: agencyError } = await (supabase as any)
          .from('agencies')
          .select('*')
          .eq('id', profile.agency_id)
          .single()

        if (agencyError || !agency) {
          console.error("[AuthProvider] Agency error:", agencyError);
          throw agencyError;
        }

        const { data: branding } = await (supabase as any)
          .from('branding_settings')
          .select('primary_color, logo_url')
          .eq('agency_id', profile.agency_id)
          .maybeSingle()

        // Map to our frontend formats
        const mappedRole: User["role"] =
          profile.role === 'owner' ? 'Owner' :
          profile.role === 'admin' ? 'Admin' :
          profile.role === 'agent' ? 'Migration Agent' :
          profile.role === 'manager' ? 'Case Manager' :
          profile.role === 'support' ? 'Assistant' : 'Read-only staff'

        const mappedUser: User = {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          avatar: profile.full_name.substring(0, 2).toUpperCase(),
          role: mappedRole,
          marn: profile.marn || "N/A",
          agency_id: profile.agency_id
        }

        const mappedWorkspace = {
          id: agency.id,
          name: agency.name,
          slug: agency.slug,
          initials: agency.name.substring(0, 2).toUpperCase(),
          color: branding?.primary_color || "#0D9F8C",
          logoUrl: branding?.logo_url || undefined,
          address: agency.address || "Head Office",
          marn: agency.marn || "1234567",
          abn: agency.abn || "12 345 678 910",
          team: []
        }

        console.log("[AuthProvider] Successfully mapped workspace slug:", mappedWorkspace.slug);

        setAuthState({
          user: mappedUser,
          activeWorkspace: mappedWorkspace,
          workspaces: [mappedWorkspace],
        })
      } catch (error) {
        console.error("[AuthProvider] Error fetching profile/workspace:", error)
        setAuthState({ user: null, activeWorkspace: null })
      } finally {
        setIsInitializing(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthProvider] onAuthStateChange event triggered:", event, "hasUser:", !!session?.user);
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        if (session?.user) {
          setIsInitializing(true)
          window.setTimeout(() => {
            void fetchProfileAndWorkspace(session.user.id)
          }, 0)
        } else {
          console.log("[AuthProvider] No session user found. Resetting auth state.");
          setAuthState({ user: null, activeWorkspace: null })
          setIsInitializing(false)
        }
      } else if (event === "SIGNED_OUT") {
        console.log("[AuthProvider] Signed out event triggered. Resetting auth state.");
        setAuthState({ user: null, activeWorkspace: null })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, setAuthState])

  return <>{children}</>
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

/** Returns active workspace slug/id or redirects to onboarding when unresolved. */
export function useRequireWorkspace() {
  const router = useRouter()
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const user = useAuthStore((s) => s.user)
  const slug = activeWorkspace?.slug
  const agencyId = activeWorkspace?.id

  useEffect(() => {
    // Only redirect when session is loaded but workspace is missing (new signup).
    if (user && !slug) {
      router.replace("/onboarding")
    }
  }, [slug, user, router])

  return { slug: slug ?? null, agencyId: agencyId ?? null, activeWorkspace }
}

export function useWorkspaceSlug(): string | null {
  return useAuthStore((s) => s.activeWorkspace?.slug ?? null)
}

export function useWorkspaceId(): string | null {
  return useAuthStore((s) => s.activeWorkspace?.id ?? null)
}

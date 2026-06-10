"use client"

import * as React from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { uiRoleToDb } from "@/lib/auth/db-roles"
import { canAccessWorkspacePath } from "@/lib/auth/route-access"

export function WorkspaceAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const user = useAuthStore((state) => state.user)
  const agencySlug = params?.agency as string | undefined

  React.useEffect(() => {
    if (!user?.role || !agencySlug || !pathname) return

    const prefix = `/workspace/${agencySlug}/`
    if (!pathname.startsWith(prefix)) return

    const pathKey = pathname.slice(prefix.length).replace(/^\//, "") || "dashboard"
    const dbRole = uiRoleToDb(user.role)

    if (!canAccessWorkspacePath(dbRole, pathKey)) {
      router.replace(`/workspace/${agencySlug}/dashboard?access=denied`)
    }
  }, [user?.role, agencySlug, pathname, router])

  return <>{children}</>
}

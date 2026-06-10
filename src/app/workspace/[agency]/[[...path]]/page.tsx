"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { uiRoleToDb } from "@/lib/auth/db-roles"
import { canAccessWorkspacePath } from "@/lib/auth/route-access"
import { DashboardSkeleton } from "@/components/ui/skeletons"

// Import all subpages from saas components
import { AgreementsList } from "@/features/agreements/components/list/agreements-list"
import { 
  DashboardHomePage,
  NewAgreementPage,
  AgreementDetailPage,
  SendDocumentPage,
  DocumentLibraryPage,
  ClientsPage,
  SettingsPage,
  BillingPage,
  TemplatesPage,
  PlaceholderDashboardPage,
  ReportsPage,
  SystemHealthPage,
} from "@/components/saas/dashboard-pages"
import { ClientDetailPage } from "@/features/clients/components/ClientDetailPage"
import { OnboardingWizardPage } from "@/features/onboarding/components/OnboardingWizardPage"

export default function WorkspaceCatchAllPage() {
  const params = useParams()
  const router = useRouter()
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)
  const user = useAuthStore((state) => state.user)

  // Extract path and agency parameters
  const agencySlug = params?.agency as string
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  const pathKey = path.join("/")

  // Keep the URL synced to the authenticated workspace returned by Supabase.
  React.useEffect(() => {
    if (agencySlug && activeWorkspace && activeWorkspace.slug !== agencySlug) {
      const nextPath = pathKey ? `/${pathKey}` : "/dashboard"
      router.replace(`/workspace/${activeWorkspace.slug}${nextPath}`)
    }
  }, [agencySlug, activeWorkspace, pathKey, router])

  React.useEffect(() => {
    if (!user?.role || !pathKey) return
    const dbRole = uiRoleToDb(user.role)
    if (!canAccessWorkspacePath(dbRole, pathKey)) {
      router.replace(`/workspace/${agencySlug}/dashboard?access=denied`)
    }
  }, [user?.role, pathKey, agencySlug, router])

  // Resolve and render corresponding page component based on the active path array
  const renderSubPage = () => {
    if (path.length === 0 || path[0] === "dashboard") {
      return <DashboardHomePage />
    }

    const route = path[0].toLowerCase()

    switch (route) {
      case "application-approvals": {
        const suffix = path.length > 1 ? `/${path.slice(1).join("/")}` : ""
        router.replace(`/workspace/${agencySlug}/approvals${suffix}`)
        return (
          <div className="p-8 text-center text-slate-500">Redirecting to Application Approvals…</div>
        )
      }

      case "agreements":
        if (path[1] === "new") {
          return <NewAgreementPage />
        }
        if (path[1]) {
          router.replace(`/workspace/${agencySlug}/agreements/${path[1]}`)
          return (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              Opening agreement workspace…
            </div>
          )
        }
        return <AgreementsList agencySlug={agencySlug} />

      case "documents":
        if (path[1] === "send") {
          return <SendDocumentPage />
        }
        if (path[1] === "library") {
          return <DocumentLibraryPage />
        }
        return <PlaceholderDashboardPage title="Documents Section" />

      case "templates":
        return <TemplatesPage />

      case "onboarding":
        if (path[1] === "new") {
          return <OnboardingWizardPage agencySlug={agencySlug} />
        }
        router.replace(`/workspace/${agencySlug}/clients`)
        return (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">
            Redirecting to clients…
          </div>
        )

      case "clients":
        if (path[1]) {
          return <ClientDetailPage />
        }
        return <ClientsPage />

      case "analytics":
        router.replace(`/workspace/${agencySlug}/dashboard`)
        return (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">
            Redirecting to dashboard…
          </div>
        )

      case "reports":
        return <ReportsPage />

      case "billing":
        return <BillingPage />

      case "admin":
        if (path[1] === "system-health") {
          return <SystemHealthPage />
        }
        return <PlaceholderDashboardPage title="Admin" />

      case "settings":
        if (path[1]) {
          const sectionMap: Record<string, string> = {
            agency: "Agency Profile",
            team: "RMA Team",
            branding: "Branding",
            clauses: "Clauses",
            "matter-types": "Matter Types",
            "payment-schedules": "Payment Schedules",
            defaults: "Defaults",
            financial: "Financial Settings",
            security: "Security",
          }
          const sectionName = sectionMap[path[1].toLowerCase()] || "Agency Profile"
          return <SettingsPage section={sectionName} />
        }
        return <SettingsPage section="Agency Profile" />

      default:
        return <PlaceholderDashboardPage title={`${path.join(" / ")}`} />
    }
  }

  // Loading state placeholder while AuthProvider resolves the real Cloud Supabase agency.
  if (agencySlug && (!activeWorkspace || activeWorkspace.slug !== agencySlug)) {
    return <DashboardSkeleton />
  }

  return renderSubPage()
}

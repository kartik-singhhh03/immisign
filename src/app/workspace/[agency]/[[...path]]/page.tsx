"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

// Import all subpages from saas components
import { 
  DashboardHomePage,
  AgreementsPage,
  NewAgreementPage,
  AgreementDetailPage,
  SendDocumentPage,
  DocumentLibraryPage,
  ClientsPage,
  ClientDetailPage,
  AnalyticsPage,
  ReportsPage,
  SettingsPage,
  BillingPage,
  TemplatesPage,
  PlaceholderDashboardPage
} from "@/components/saas/dashboard-pages"

import {
  ApplicationApprovalsHomePage,
  NewApplicationApprovalPage,
  ApplicationApprovalDetailPage
} from "@/components/saas/application-approvals/pages"

export default function WorkspaceCatchAllPage() {
  const params = useParams()
  const { activeWorkspace, switchWorkspace } = useAuthStore()

  // Extract path and agency parameters
  const agencySlug = params?.agency as string
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []

  // Keep workspace state in sync with URL
  React.useEffect(() => {
    if (agencySlug && activeWorkspace?.slug !== agencySlug) {
      switchWorkspace(agencySlug)
    }
  }, [agencySlug, activeWorkspace, switchWorkspace])

  // Resolve and render corresponding page component based on the active path array
  const renderSubPage = () => {
    if (path.length === 0 || path[0] === "dashboard") {
      return <DashboardHomePage />
    }

    const route = path[0].toLowerCase()

    switch (route) {
      case "application-approvals":
        if (path[1] === "new") {
          return <NewApplicationApprovalPage />
        }
        if (path[1]) {
          return <ApplicationApprovalDetailPage id={path[1]} />
        }
        return <ApplicationApprovalsHomePage />

      case "agreements":
        if (path[1] === "new") {
          return <NewAgreementPage />
        }
        if (path[1]) {
          return <AgreementDetailPage />
        }
        return <AgreementsPage />

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

      case "clients":
        if (path[1]) {
          return <ClientDetailPage />
        }
        return <ClientsPage />

      case "analytics":
        return <AnalyticsPage />

      case "reports":
        return <ReportsPage />

      case "billing":
        return <BillingPage />

      case "settings":
        if (path[1]) {
          const sectionMap: Record<string, string> = {
            agency: "Agency Profile",
            team: "Team",
            branding: "Branding",
            clauses: "Clauses",
            "matter-types": "Matter Types",
            "payment-schedules": "Payment Schedules",
            defaults: "Defaults",
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

  // Loading state placeholder if workspace context is synchronising
  if (agencySlug && activeWorkspace?.slug !== agencySlug) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D9F8C] border-t-transparent" />
        <p className="text-sm font-bold text-slate-500">Syncing workspace credentials...</p>
      </div>
    )
  }

  return renderSubPage()
}

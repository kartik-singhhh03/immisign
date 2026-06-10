"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { DashboardSkeleton } from "@/components/ui/skeletons"

function PageLoading() {
  return <DashboardSkeleton />
}

// -------------------------------------------------------------
// DYNAMIC CODE-SPLITTING PAGE LAYERS (ssr: false only for browser heavy visualization blocks if internally needed)
// -------------------------------------------------------------

export const DashboardHomePage = dynamic(
  () => import("@/features/dashboard/components/DashboardHomePage").then(m => m.DashboardHomePage),
  { loading: () => <PageLoading /> }
)

export const AgreementsPage = dynamic(
  () => import("@/features/agreements/components/AgreementsPage").then(m => m.AgreementsPage),
  { loading: () => <PageLoading /> }
)

export const NewAgreementPage = dynamic(
  () => import("@/features/agreements/components/NewAgreementPage").then(m => m.NewAgreementPage),
  { loading: () => <PageLoading /> }
)

export const AgreementDetailPage = dynamic(
  () => import("@/features/agreements/components/AgreementDetailPage").then(m => m.AgreementDetailPage),
  { loading: () => <PageLoading /> }
)

export const SendDocumentPage = dynamic(
  () => import("@/features/documents/components/SendDocumentPage").then(m => m.SendDocumentPage),
  { loading: () => <PageLoading /> }
)

export const DocumentLibraryPage = dynamic(
  () => import("@/features/documents/components/DocumentLibraryPage").then(m => m.DocumentLibraryPage),
  { loading: () => <PageLoading /> }
)

export const TemplatesPage = dynamic(
  () => import("@/features/templates/components/TemplatesPage").then(m => m.TemplatesPage),
  { loading: () => <PageLoading /> }
)

export const ClientsPage = dynamic(
  () => import("@/features/clients/components/ClientsPage").then(m => m.ClientsPage),
  { loading: () => <PageLoading /> }
)

export const ReportsPage = dynamic(
  () => import("@/features/reports/components/ReportsPage").then(m => m.ReportsPage),
  { loading: () => <PageLoading /> }
)

export const AnalyticsPage = dynamic(
  () => import("@/features/analytics/components/AnalyticsPage").then(m => m.AnalyticsPage),
  { loading: () => <PageLoading />, ssr: false } // Client-side dynamic SVG charting
)

export const SettingsPage = dynamic(
  () => import("@/features/settings/components/SettingsPage").then(m => m.SettingsPage),
  { loading: () => <PageLoading /> }
)

export const BillingPage = dynamic(
  () => import("@/features/billing/components/BillingPage").then(m => m.BillingPage),
  { loading: () => <PageLoading /> }
)

export const PlaceholderDashboardPage = dynamic(
  () => import("@/features/dashboard/components/PlaceholderDashboardPage").then(m => m.PlaceholderDashboardPage),
  { loading: () => <PageLoading /> }
)

export const SystemHealthPage = dynamic(
  () => import("@/features/admin/components/SystemHealthPage").then(m => m.SystemHealthPage),
  { loading: () => <PageLoading /> }
)

// -------------------------------------------------------------
// SECURE SYSTEM STATUS PILL (REUSED STYLING WIDGET EXPORT)
// -------------------------------------------------------------

function statusClass(status: string) {
  const s = status.toLowerCase()
  if (s === "signed" || s === "active" || s === "completed") {
    return "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.02)]"
  }
  if (s === "awaiting" || s === "awaiting signature" || s === "sent to client" || s === "under_review") {
    return "border-amber-250 bg-amber-50 text-amber-700 shadow-[0_1px_2px_rgba(245,158,11,0.02)]"
  }
  if (s === "sent" || s === "document review" || s === "under review" || s === "changes_requested") {
    return "border-blue-250 bg-blue-50 text-blue-700 shadow-[0_1px_2px_rgba(59,130,246,0.02)]"
  }
  if (s === "expired" || s === "failed" || s === "voided") {
    return "border-red-250 bg-red-50 text-red-700 shadow-[0_1px_2px_rgba(239,68,68,0.02)]"
  }
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide transition-all ${statusClass(status)}`}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  )
}

"use client"

import React from "react"
import { useAuthStore } from "@/store/authStore"
import { useAgreements } from "@/lib/hooks/useSupabaseData"
import { AgreementsList } from "./list/agreements-list"

export function AgreementsPage() {
  const { data: rawAgreements = [], loading } = useAgreements()
  const currentSlug = useAuthStore(s => s.activeWorkspace?.slug || "avc-migration")

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading agreements workspace...</div>
  }

  const agreements = rawAgreements.map((a: any) => ({
    id: a.id || a.real_id || "AGR-000",
    client: a.client || "Client Name",
    email: a.email || "client@example.com",
    matter: a.matter || "General Matter",
    fee: a.fee || ".00",
    status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : "Draft",
    date: a.date || new Date().toLocaleDateString(),
    scope: a.scope || "General Scope",
    law: a.law || "NSW"
  }))

  return <AgreementsList initialAgreements={agreements} agencySlug={currentSlug} />
}

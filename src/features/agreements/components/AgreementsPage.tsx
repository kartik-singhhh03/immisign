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
    id: a.id || a.real_id,
    client: a.client,
    email: a.email,
    matter: a.matter,
    fee: a.fee,
    status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : "Draft",
    date: a.date,
    scope: a.scope,
    law: a.law
  }))

  return <AgreementsList initialAgreements={agreements} agencySlug={currentSlug} />
}

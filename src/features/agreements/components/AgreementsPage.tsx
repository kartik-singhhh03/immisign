"use client"

import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { AgreementsList } from "./list/agreements-list"

export function AgreementsPage() {
  const { slug: currentSlug } = useRequireWorkspace()

  if (!currentSlug) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading agreements workspace...</div>
  }

  return <AgreementsList agencySlug={currentSlug} />
}

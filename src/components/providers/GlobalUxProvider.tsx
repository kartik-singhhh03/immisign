"use client"

import { GlobalActionProgress, GlobalLoadingOverlay } from "@/components/ui/standards/global-loading"

export function GlobalUxProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GlobalLoadingOverlay />
      <GlobalActionProgress />
    </>
  )
}

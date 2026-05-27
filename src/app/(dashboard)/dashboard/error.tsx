"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-white px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Dashboard could not load
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Refresh the dashboard data and try again.
        </p>
      </div>
      <Button onClick={reset}>Retry</Button>
    </div>
  )
}

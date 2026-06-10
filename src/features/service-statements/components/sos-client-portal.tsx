"use client"

import * as React from "react"
import { Check, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { pageHeaderTypography } from "@/components/layout/PageHeader"

export function SosClientPortal({
  token,
  initial,
}: {
  token: string
  initial: {
    statement_number: string | null
    client_name: string | null
    status: string
    acknowledged_at: string | null
    agency_name: string
    documentUrl: string | null
  }
}) {
  const [status, setStatus] = React.useState(initial.status)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch(`/api/sos/review/${token}/view`, { method: "POST" }).catch(() => {})
  }, [token])

  const acknowledge = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sos/review/${token}/acknowledge`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setStatus("acknowledged")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  if (status === "acknowledged" || initial.acknowledged_at) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#111111] text-white">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-normal tracking-tight text-[#111111]">Thank you</h1>
        <p className="mt-3 text-sm text-[#5C5C5C]">
          Your acknowledgement of {initial.statement_number || "the Statement of Service"} has been recorded.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <header className="bg-[#111111] px-6 py-4 text-white">
        <p className="text-sm font-semibold">{initial.agency_name}</p>
        <p className="text-xs text-white/60">Statement of Service</p>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className={pageHeaderTypography.eyebrow}>Statement of Service</p>
        <h1 className={pageHeaderTypography.title}>
          {initial.statement_number || "Statement of Service"}
        </h1>
        <p className={pageHeaderTypography.description}>
          Prepared for {initial.client_name || "you"}. Please review and acknowledge receipt.
        </p>

        {initial.documentUrl ? (
          <div className="mt-6 overflow-hidden rounded-lg border border-[#e2e0d8] bg-white">
            <iframe
              src={initial.documentUrl}
              title="Statement of Service"
              className="h-[70vh] w-full"
            />
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#e2e0d8] bg-white p-6 text-sm text-[#6b7280]">
            <FileText className="h-5 w-5" />
            Document preview unavailable. Contact your migration agent.
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            disabled={busy}
            onClick={acknowledge}
            className="h-12 rounded-lg bg-[#2a7a6a] px-8 text-base hover:bg-[#236b5c]"
          >
            {busy ? "Recording…" : "I acknowledge receipt of this Statement of Service"}
          </Button>
        </div>
      </div>
    </div>
  )
}

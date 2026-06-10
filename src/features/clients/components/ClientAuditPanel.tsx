"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"

type AuditRow = {
  id: string
  document_type: string
  document_id: string
  event_type: string
  event_timestamp: string
  actor_name: string | null
  actor_email: string | null
  ip_address: string | null
  provider: string | null
  metadata: Record<string, unknown>
}

function formatTs(ts: string | null | undefined): string {
  if (!ts) return "Not Provided"
  try {
    return new Date(ts).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
  } catch {
    return ts
  }
}

function docLabel(type: string): string {
  switch (type) {
    case "service_agreement":
      return "Service Agreement"
    case "application_approval":
      return "Application Approval"
    case "statement_of_service":
      return "Statement of Service"
    case "certificate":
      return "Certificate"
    default:
      return type
  }
}

export function ClientAuditPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = React.useState<AuditRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/clients/${clientId}/audit-events`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRows(j.events || [])
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const grouped = React.useMemo(() => {
    const map = new Map<string, AuditRow[]>()
    for (const row of rows) {
      const key = `${row.document_type}:${row.document_id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return [...map.entries()]
  }, [rows])

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-[#111111] mb-1">Audit</h2>
        <p className="text-xs text-slate-500 mb-5 font-medium">
          Document events from webhooks and system actions. Signature dates are never manually entered.
        </p>

        {loading && <p className="text-sm text-slate-400 animate-pulse">Loading audit trail…</p>}

        {!loading && grouped.length === 0 && (
          <p className="text-sm text-slate-500 font-semibold">No audit events recorded yet.</p>
        )}

        <div className="space-y-4">
          {grouped.map(([key, events]) => {
            const sample = events[0]
            const sent = events.find((e) => e.event_type === "sent")
            const viewed = events.find((e) => e.event_type === "viewed")
            const signed = events.find((e) => e.event_type === "signed" || e.event_type === "completed")
            const acknowledged = events.find((e) => e.event_type === "acknowledged")
            const generated = events.find((e) => e.event_type === "generated")

            return (
              <div key={key} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-bold text-[#111111]">{docLabel(sample.document_type)}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{sample.document_id.slice(0, 8)}…</p>
                <dl className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
                  <div><dt className="text-slate-400 font-bold uppercase">Sent At</dt><dd className="font-semibold">{formatTs(sent?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Viewed At</dt><dd className="font-semibold">{formatTs(viewed?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Signed At</dt><dd className="font-semibold">{formatTs(signed?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Acknowledged At</dt><dd className="font-semibold">{formatTs(acknowledged?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Generated At</dt><dd className="font-semibold">{formatTs(generated?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Signed By</dt><dd className="font-semibold">{signed?.actor_name || signed?.actor_email || "Not Provided"}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">IP Address</dt><dd className="font-semibold">{signed?.ip_address || viewed?.ip_address || "Not Provided"}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Provider</dt><dd className="font-semibold">{signed?.provider || sample.provider || "Not Provided"}</dd></div>
                </dl>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

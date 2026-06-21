"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { formatSydneyDateTime } from "@/lib/datetime/sydney"
import { APP_NAME } from "@/lib/brand"

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
  return formatSydneyDateTime(ts)
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

function pickEvent(events: AuditRow[], type: string): AuditRow | undefined {
  const matches = events.filter((e) => e.event_type === type)
  if (matches.length === 0) return undefined
  if (type === "signed") {
    return (
      matches.find((e) => e.provider) ||
      matches.sort(
        (a, b) =>
          new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime(),
      )[0]
    )
  }
  return matches.sort(
    (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
  )[0]
}

function pickCompletedAction(events: AuditRow[], action: string): AuditRow | undefined {
  return events
    .filter((e) => e.event_type === "completed" && e.metadata?.action === action)
    .sort(
      (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
    )[0]
}

const APPROVAL_PROVIDER = `${APP_NAME} Approval Portal`
const AGREEMENT_PROVIDER = `${APP_NAME} Native Signing Portal`

function providerLabel(row: AuditRow, events: AuditRow[]): string {
  if (row.document_type === "application_approval") {
    return row.provider || APPROVAL_PROVIDER
  }
  if (row.document_type === "service_agreement") {
    const raw =
      row.provider ||
      events.find((e) => e.provider)?.provider ||
      AGREEMENT_PROVIDER
    return raw.replace(/ImmiSign/gi, APP_NAME)
  }
  const signed = events.find((e) => e.event_type === "signed" || e.event_type === "completed")
  return signed?.provider || row.provider || events.find((e) => e.provider)?.provider || APPROVAL_PROVIDER
}

function attachedFilename(events: AuditRow[]): string | null {
  for (const e of events) {
    const name = e.metadata?.original_filename
    if (typeof name === "string" && name.trim()) return name
  }
  return null
}

function emailStatus(sent: AuditRow | undefined): string | null {
  if (!sent) return null
  const status = sent.metadata?.email_delivery_status
  if (typeof status === "string") return status
  if (sent.metadata?.resend_id) return "accepted"
  return null
}

export function ClientAuditPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = React.useState<AuditRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/clients/${clientId}/audit-events`, { credentials: "include", cache: "no-store" })
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
          Times shown in Australian Eastern time (Sydney).
        </p>

        {loading && <p className="text-sm text-slate-400 animate-pulse">Loading audit trail…</p>}

        {!loading && grouped.length === 0 && (
          <p className="text-sm text-slate-500 font-semibold">No audit events recorded yet.</p>
        )}

        <div className="space-y-4">
          {grouped.map(([key, events]) => {
            const sample = events[0]
            const sent = pickEvent(events, "sent")
            const viewed = pickEvent(events, "viewed")
            const signed = pickEvent(events, "signed")
            const acknowledged = pickEvent(events, "acknowledged")
            const generated = pickEvent(events, "generated")
            const changesRequested = events.find(
              (e) =>
                e.event_type === "completed" &&
                e.metadata?.action === "changes_requested",
            )
            const downloaded = pickCompletedAction(events, "application_downloaded")
            const agreementDownloaded = pickCompletedAction(events, "agreement_downloaded")
            const fileNoteCreated = pickCompletedAction(events, "file_note_created")
            const agentNotified = pickCompletedAction(events, "agent_notified")
            const clientNotified = pickCompletedAction(events, "client_notified")
            const isApproval = sample.document_type === "application_approval"
            const isAgreement = sample.document_type === "service_agreement"
            const attached = attachedFilename(events)
            const signedLabel = isApproval ? "Approved At" : "Signed At"
            const signedByLabel = isApproval ? "Approved By" : "Signed By"

            return (
              <div key={key} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-bold text-[#111111]">{docLabel(sample.document_type)}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{sample.document_id.slice(0, 8)}…</p>
                {attached && (
                  <p className="mt-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase">Attached File </span>
                    <span className="font-semibold text-[#111111]">{attached}</span>
                  </p>
                )}
                <dl className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
                  <div><dt className="text-slate-400 font-bold uppercase">Sent At</dt><dd className="font-semibold">{formatTs(sent?.event_timestamp)}</dd></div>
                  {isApproval && (
                    <div><dt className="text-slate-400 font-bold uppercase">Email Status</dt><dd className="font-semibold">{emailStatus(sent) || "Not Provided"}</dd></div>
                  )}
                  <div><dt className="text-slate-400 font-bold uppercase">Viewed At</dt><dd className="font-semibold">{formatTs(viewed?.event_timestamp)}</dd></div>
                  {isApproval && downloaded && (
                    <div><dt className="text-slate-400 font-bold uppercase">Downloaded At</dt><dd className="font-semibold">{formatTs(downloaded.event_timestamp)}</dd></div>
                  )}
                  {isAgreement && agreementDownloaded && (
                    <div><dt className="text-slate-400 font-bold uppercase">Downloaded At</dt><dd className="font-semibold">{formatTs(agreementDownloaded.event_timestamp)}</dd></div>
                  )}
                  <div><dt className="text-slate-400 font-bold uppercase">{signedLabel}</dt><dd className="font-semibold">{formatTs(signed?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Acknowledged At</dt><dd className="font-semibold">{formatTs(acknowledged?.event_timestamp)}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Generated At</dt><dd className="font-semibold">{formatTs(generated?.event_timestamp)}</dd></div>
                  {isApproval && fileNoteCreated && (
                    <div><dt className="text-slate-400 font-bold uppercase">File Note Created</dt><dd className="font-semibold">{formatTs(fileNoteCreated.event_timestamp)}</dd></div>
                  )}
                  {isAgreement && fileNoteCreated && (
                    <div><dt className="text-slate-400 font-bold uppercase">File Note Created</dt><dd className="font-semibold">{formatTs(fileNoteCreated.event_timestamp)}</dd></div>
                  )}
                  {isApproval && agentNotified && (
                    <div><dt className="text-slate-400 font-bold uppercase">Agent Notified</dt><dd className="font-semibold">{formatTs(agentNotified.event_timestamp)}</dd></div>
                  )}
                  {isAgreement && clientNotified && (
                    <div><dt className="text-slate-400 font-bold uppercase">Client Notified</dt><dd className="font-semibold">{formatTs(clientNotified.event_timestamp)}</dd></div>
                  )}
                  {isAgreement && agentNotified && (
                    <div><dt className="text-slate-400 font-bold uppercase">Agent Notified</dt><dd className="font-semibold">{formatTs(agentNotified.event_timestamp)}</dd></div>
                  )}
                  {changesRequested && (
                    <>
                      <div><dt className="text-slate-400 font-bold uppercase">Changes Requested At</dt><dd className="font-semibold">{formatTs(changesRequested.event_timestamp)}</dd></div>
                      <div className="md:col-span-2"><dt className="text-slate-400 font-bold uppercase">Change Reason</dt><dd className="font-semibold">{String(changesRequested.metadata?.change_reason || "Not Provided")}</dd></div>
                    </>
                  )}
                  <div><dt className="text-slate-400 font-bold uppercase">{signedByLabel}</dt><dd className="font-semibold">{signed?.actor_name || signed?.actor_email || "Not Provided"}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">IP Address</dt><dd className="font-semibold">{signed?.ip_address || viewed?.ip_address || changesRequested?.ip_address || "Not Provided"}</dd></div>
                  <div><dt className="text-slate-400 font-bold uppercase">Provider</dt><dd className="font-semibold">{providerLabel(sample, events)}</dd></div>
                </dl>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

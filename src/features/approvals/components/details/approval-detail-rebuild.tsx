"use client"

import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { ApprovalStatusBadge } from "../status-badge"
import type { ApplicationApprovalRecord } from "../../types/rebuild"

type TimelineEvent = {
  id: string
  event_type: string
  description: string | null
  created_at: string
}

export function ApprovalDetailRebuild({
  approval,
  events,
  agencySlug,
}: {
  approval: ApplicationApprovalRecord
  events: TimelineEvent[]
  agencySlug: string
}) {
  const clientName = approval.clients?.name || "—"

  return (
    <div className="animate-enter space-y-6">
      <Link
        href={`/workspace/${agencySlug}/approvals`}
        className="inline-flex items-center gap-2 text-sm font-medium text-mate-muted hover:text-mate-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to approvals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mate-accent">
            Application Approval
          </p>
          <h1 className="font-display text-3xl text-mate-primary">
            {approval.matter_reference || "Approval"}
          </h1>
          <p className="mt-1 text-sm text-mate-muted">
            {clientName} · {approval.visa_subclass || "—"}
          </p>
        </div>
        <ApprovalStatusBadge status={approval.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-mate-border bg-white p-6">
          <h2 className="text-sm font-bold text-mate-primary">Details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow label="Client" value={clientName} />
            <DetailRow label="Email" value={approval.clients?.email || "—"} />
            <DetailRow label="Matter" value={approval.matter_reference || "—"} />
            <DetailRow label="Visa subclass" value={approval.visa_subclass || "—"} />
            <DetailRow
              label="Sent"
              value={approval.sent_at ? new Date(approval.sent_at).toLocaleString() : "—"}
            />
            <DetailRow
              label="Viewed"
              value={approval.viewed_at ? new Date(approval.viewed_at).toLocaleString() : "—"}
            />
            <DetailRow
              label="Approved"
              value={approval.approved_at ? new Date(approval.approved_at).toLocaleString() : "—"}
            />
            {approval.client_name_confirmed && (
              <DetailRow label="Name confirmed" value={approval.client_name_confirmed} />
            )}
            {approval.change_request_reason && (
              <DetailRow label="Change request" value={approval.change_request_reason} />
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-mate-border bg-white p-6">
          <h2 className="text-sm font-bold text-mate-primary">Application file</h2>
          {approval.application_file_name ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-mate-border bg-mate-offwhite p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mate-primary text-white">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{approval.application_file_name}</p>
                <p className="text-xs text-mate-muted">
                  {approval.application_file_size
                    ? `${Math.round(approval.application_file_size / 1024)} KB`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-mate-muted">No file attached</p>
          )}

          {approval.message_subject && (
            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase text-mate-muted">Subject</p>
              <p className="mt-1 text-sm">{approval.message_subject}</p>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-mate-border bg-white p-6">
        <h2 className="text-sm font-bold text-mate-primary">Matter timeline</h2>
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-mate-muted">No events recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-4 border-b border-mate-border pb-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-mate-primary">
                    {formatEventType(ev.event_type)}
                  </p>
                  {ev.description && (
                    <p className="text-xs text-mate-muted">{ev.description}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-mate-muted">
                  {new Date(ev.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mate-muted">{label}</dt>
      <dd className="text-right font-medium text-mate-primary">{value}</dd>
    </div>
  )
}

function formatEventType(type: string) {
  const map: Record<string, string> = {
    approval_created: "Application approval created",
    approval_sent: "Application approval sent",
    client_viewed: "Client viewed application",
    client_downloaded: "Client downloaded application",
    client_approved: "Client approved application",
    client_requested_changes: "Client requested changes",
  }
  return map[type] || type.replace(/_/g, " ")
}

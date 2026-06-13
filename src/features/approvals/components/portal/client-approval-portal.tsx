"use client"

import * as React from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Shield,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ApplicationApprovalRecord } from "@/features/approvals/types/rebuild"

type PortalMeta = {
  agencyName: string
  agentName: string
  agentEmail: string
}

export function ClientApprovalPortal({
  token,
  meta,
}: {
  token: string
  meta: PortalMeta
}) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [approval, setApproval] = React.useState<ApplicationApprovalRecord | null>(null)
  const [completed, setCompleted] = React.useState(false)
  const [alreadyCompleted, setAlreadyCompleted] = React.useState(false)

  const [check1, setCheck1] = React.useState(false)
  const [check2, setCheck2] = React.useState(false)
  const [check3, setCheck3] = React.useState(false)
  const [fullName, setFullName] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [showDecline, setShowDecline] = React.useState(false)
  const [declineReason, setDeclineReason] = React.useState("")

  React.useEffect(() => {
    fetch(`/api/public/approval/${token}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) {
          setError(json.error || (r.status === 410 ? "Link expired" : "Link not found"))
          return
        }
        setApproval(json.approval)
        setCompleted(Boolean(json.completed))
      })
      .catch(() => setError("Unable to load approval"))
      .finally(() => setLoading(false))
  }, [token])

  const clientName = approval?.clients?.name || "Client"
  const clientEmail = approval?.clients?.email || ""
  const matterRef = approval?.matter_reference || "—"
  const visaSubclass = approval?.visa_subclass || "—"
  const fileName = approval?.application_file_name || "Application.pdf"
  const fileSize = approval?.application_file_size || 0

  const handleApprove = async () => {
    if (!check1 || !check2 || !check3 || !fullName.trim()) {
      alert("Please complete all confirmations and enter your full legal name.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/approval/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", clientName: fullName.trim() }),
      })
      const json = await res.json()
      if (res.status === 409 || res.status === 410) {
        if (json.approval) setApproval(json.approval)
        setAlreadyCompleted(true)
        return
      }
      if (!res.ok) throw new Error(json.error || "Approval failed")
      setApproval(json.approval)
      setCompleted(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approval failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      alert("Please describe your concerns.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/approval/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", reason: declineReason.trim() }),
      })
      const json = await res.json()
      if (res.status === 409 || res.status === 410) {
        if (json.approval) setApproval(json.approval)
        setAlreadyCompleted(true)
        return
      }
      if (!res.ok) throw new Error(json.error || "Could not submit")
      setApproval(json.approval)
      setCompleted(true)
      setShowDecline(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not submit")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mate-offwhite">
        <p className="text-sm text-mate-muted">Loading approval…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mate-offwhite p-6">
        <div className="max-w-md rounded-2xl border border-mate-border bg-white p-10 text-center shadow-sm">
          <Shield className="mx-auto h-12 w-12 text-mate-muted" />
          <h1 className="mt-4 font-display text-2xl text-mate-primary">
            {error === "Link expired" ? "Link Expired" : "Unable to Load"}
          </h1>
          <p className="mt-3 text-sm text-mate-muted">
            {error === "Link expired"
              ? "This approval link has expired or is no longer valid. Please contact your migration agent for a new link."
              : error}
          </p>
        </div>
      </div>
    )
  }

  if (alreadyCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mate-offwhite p-6">
        <div className="max-w-md rounded-2xl border border-mate-border bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 font-display text-2xl text-mate-primary">Already Completed</h1>
          <p className="mt-3 text-sm text-mate-muted">
            Application approval already completed.
          </p>
        </div>
      </div>
    )
  }

  if (!approval) return null

  if (approval.status === "approved" || completed && approval.status === "approved") {
    return (
      <SuccessScreen
        title="Application Approved"
        approval={approval}
        clientName={clientName}
        matterRef={matterRef}
        visaSubclass={visaSubclass}
        variant="approved"
      />
    )
  }

  if (approval.status === "changes_requested") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mate-offwhite p-6">
        <div className="max-w-lg rounded-2xl border border-mate-border bg-white p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
          <h1 className="mt-4 font-display text-2xl text-mate-primary">Concerns Submitted</h1>
          <p className="mt-3 text-sm text-mate-muted">
            Your migration agent has been notified. They will contact you before lodging the
            application.
          </p>
        </div>
      </div>
    )
  }

  const canSubmit = check1 && check2 && check3 && fullName.trim().length > 1

  return (
    <div className="min-h-screen bg-mate-offwhite py-10 font-sans">
      <div className="mx-auto max-w-2xl px-4">
        <header className="mb-8 border-b border-mate-border pb-6">
          <p className="text-xs text-mate-muted">
            <span className="font-semibold">From:</span> {meta.agentName} &lt;{meta.agentEmail}&gt;
          </p>
          <p className="mt-1 text-xs text-mate-muted">
            <span className="font-semibold">To:</span> {clientName} &lt;{clientEmail}&gt;
          </p>
          <p className="mt-1 text-xs text-mate-muted">
            <span className="font-semibold">Date:</span>{" "}
            {approval.sent_at ? new Date(approval.sent_at).toLocaleString() : new Date().toLocaleString()}
          </p>
          <h1 className="mt-6 font-display text-2xl text-mate-primary md:text-3xl">
            {approval.message_subject ||
              `Application for Review & Approval — ${matterRef}`}
          </h1>
        </header>

        <div className="space-y-6 rounded-2xl border border-mate-border bg-white p-6 shadow-sm md:p-8">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-mate-secondary">
            {approval.message_body}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-mate-muted">
              Attachment
            </p>
            <div className="mt-3 flex flex-col gap-4 rounded-xl border border-mate-border bg-mate-offwhite p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mate-primary text-white">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-mate-primary">{fileName}</p>
                  <p className="text-xs text-mate-muted">
                    Final application package · {formatBytes(fileSize)} · PDF
                  </p>
                </div>
              </div>
              <a
                href={`/api/public/approval/${token}/download`}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-mate-primary px-5 text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Important — please read before approving
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
                  By approving this application you confirm that you have read and understood all
                  contents of the attached document. You are authorising your migration agent to
                  lodge this application on your behalf. This approval is legally significant and
                  will be recorded with a timestamp and your IP address as part of your matter
                  file.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-mate-border pt-6">
            <h2 className="font-display text-lg text-mate-primary">Approve this application</h2>
            <div className="mt-4 space-y-3">
              <CheckboxRow
                checked={check1}
                onChange={setCheck1}
                testId="approval-checkbox-read"
                label="I have downloaded and read the full application attached to this notice."
              />
              <CheckboxRow
                checked={check2}
                onChange={setCheck2}
                testId="approval-checkbox-authorise"
                label={`I authorise lodgement. I authorise ${meta.agencyName} to lodge this application on my behalf.`}
              />
              <CheckboxRow
                checked={check3}
                onChange={setCheck3}
                testId="approval-checkbox-understand"
                label="I understand the consequences. I understand that once lodged, the application cannot be amended without additional cost and process."
              />
            </div>

            <label className="mt-6 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-mate-muted">
                Type your full name to confirm identity
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="approval-name-input"
                placeholder={`e.g. ${clientName}`}
                className="mt-2 h-11 w-full rounded-xl border border-mate-border px-4 text-sm"
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                data-testid="approval-submit"
                disabled={!canSubmit || submitting}
                onClick={handleApprove}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-mate-accent px-6 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                {submitting ? "Submitting…" : "Approve Application for Lodgement"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowDecline(true)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-mate-border bg-white px-6 text-sm font-semibold text-mate-secondary"
              >
                I have concerns — Do not lodge yet
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] text-mate-muted">
              This approval is timestamped and your IP address is recorded as part of a permanent,
              unalterable matter file record.
            </p>
          </div>
        </div>

        <footer className="mt-10 border-t border-mate-border pt-6 text-center text-xs text-mate-muted">
          <p className="font-semibold text-mate-secondary">{meta.agencyName}</p>
          <p className="mt-2">This is a secure, single-use approval link. Do not forward this email.</p>
        </footer>
      </div>

      {showDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg text-mate-primary">Describe your concerns</h3>
            <p className="mt-2 text-sm text-mate-muted">
              Your agent will review before lodging. Lodgement will not proceed until resolved.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-mate-border px-4 py-3 text-sm"
              placeholder="Please explain what needs to be corrected…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDecline(false)}
                className="rounded-xl border border-mate-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDecline}
                className="rounded-xl bg-mate-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Submit concerns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SuccessScreen({
  title,
  approval,
  clientName,
  matterRef,
  visaSubclass,
  variant,
}: {
  title: string
  approval: ApplicationApprovalRecord
  clientName: string
  matterRef: string
  visaSubclass: string
  variant: "approved" | "declined"
}) {
  return (
    <div className="min-h-screen bg-mate-offwhite py-12">
      <div className="mx-auto max-w-xl px-4">
        <div className="rounded-2xl border border-mate-accent/30 bg-mate-accent/10 p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-mate-accent" />
          <h1 className="mt-4 font-display text-2xl text-mate-primary">{title}</h1>
          <p className="mt-2 text-sm text-mate-muted">
            Thank you, {clientName}. Your agent has been notified.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-mate-border bg-white">
          <table className="w-full text-sm">
            <tbody>
              <AuditRow label="Client" value={clientName} />
              <AuditRow label="Matter" value={`${matterRef} — ${visaSubclass}`} />
              {approval.approved_at && (
                <AuditRow
                  label="Approved at"
                  value={new Date(approval.approved_at).toLocaleString()}
                />
              )}
              {approval.client_name_confirmed && (
                <AuditRow label="Name confirmed" value={approval.client_name_confirmed} />
              )}
              {approval.client_ip && (
                <AuditRow label="IP address" value={approval.client_ip} />
              )}
              <AuditRow
                label="Status"
                value={
                  variant === "approved" ? (
                    <span className="inline-flex items-center gap-1 text-mate-accent">
                      <Check className="h-3.5 w-3.5" /> Logged to matter file
                    </span>
                  ) : (
                    "Changes requested"
                  )
                }
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-mate-border last:border-0">
      <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-mate-muted">
        {label}
      </td>
      <td className="px-4 py-3 font-medium text-mate-primary">{value}</td>
    </tr>
  )
}

function CheckboxRow({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  testId?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-mate-border px-4 py-3 hover:bg-mate-offwhite">
      <input
        type="checkbox"
        data-testid={testId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-mate-border accent-mate-accent"
      />
      <span className="text-sm leading-relaxed text-mate-secondary">{label}</span>
    </label>
  )
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

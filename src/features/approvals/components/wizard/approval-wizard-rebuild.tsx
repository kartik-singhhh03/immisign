"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ClientSearchRow } from "@/features/file-notes/services/client-search.service"
import {
  defaultMessageSubject,
  type ApplicationApprovalRecord,
} from "@/features/approvals/types/rebuild"

const STEPS = ["Client", "Application", "Message", "Preview & Send"] as const

type MatterRow = NonNullable<ClientSearchRow["matters"]>[number]

export function ApprovalWizardRebuild({ agencySlug }: { agencySlug: string }) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [clients, setClients] = React.useState<ClientSearchRow[]>([])
  const [selectedClient, setSelectedClient] = React.useState<ClientSearchRow | null>(null)
  const [selectedMatter, setSelectedMatter] = React.useState<MatterRow | null>(null)
  const [approvalId, setApprovalId] = React.useState<string | null>(null)
  const [approval, setApproval] = React.useState<ApplicationApprovalRecord | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [messageSubject, setMessageSubject] = React.useState("")
  const [messageBody, setMessageBody] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (query.trim().length < 1) {
      setClients([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/clients/search?q=${encodeURIComponent(query.trim())}&limit=12`,
          { credentials: "include" },
        )
        const json = await res.json()
        setClients(json.clients || [])
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const ensureDraft = async () => {
    if (approvalId) return approvalId
    if (!selectedClient || !selectedMatter) throw new Error("Select client and matter")
    setBusy(true)
    try {
      const res = await fetch("/api/application-approvals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          matterId: null,
          matterReference: selectedMatter.fileNumber,
          visaSubclass: selectedMatter.visaSubclass || selectedMatter.matterType || "TBC",
          fileSource: selectedMatter.fileSource,
          fileId: selectedMatter.fileId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create draft")
      setApprovalId(json.approval.id)
      setApproval(json.approval)
      setMessageSubject(json.approval.message_subject || defaultMessageSubject(selectedMatter.fileNumber))
      setMessageBody(json.approval.message_body || "")
      return json.approval.id as string
    } finally {
      setBusy(false)
    }
  }

  const onUpload = async (file: File) => {
    const id = await ensureDraft()
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/application-approvals/${id}/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setApproval(json.approval)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const saveMessage = async () => {
    const id = approvalId || (await ensureDraft())
    const res = await fetch(`/api/application-approvals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_subject: messageSubject, message_body: messageBody }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed to save message")
    setApproval(json.approval)
  }

  const onSend = async () => {
    setSending(true)
    try {
      await saveMessage()
      const id = approvalId!
      const res = await fetch(`/api/application-approvals/${id}/send`, {
        method: "POST",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Send failed")
      setApproval(json.approval)
      setSent(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  if (sent && approval) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center animate-enter">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mate-accent/15">
          <CheckCircle2 className="h-8 w-8 text-mate-accent" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-mate-primary">Approval Request Sent</h1>
        <p className="mt-4 text-sm leading-relaxed text-mate-muted">
          Approval request sent to <strong>{selectedClient?.name}</strong> at{" "}
          {selectedClient?.email}. The application has been attached. Once the client approves, it
          will be permanently logged to matter <strong>{selectedMatter?.fileNumber}</strong>.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={`/workspace/${agencySlug}/approvals/new`}
            className="inline-flex h-11 items-center rounded-xl border border-mate-border bg-white px-5 text-sm font-semibold text-mate-primary"
          >
            New Approval
          </Link>
          {selectedClient && (
            <Link
              href={`/workspace/${agencySlug}/clients/${selectedClient.id}`}
              className="inline-flex h-11 items-center rounded-xl bg-mate-primary px-5 text-sm font-semibold text-white"
            >
              Go to Matter File
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-enter">
      <h1 className="font-display text-[2rem] text-mate-primary md:text-[2.25rem]">
        Application Approval
      </h1>
      <p className="mt-2 text-sm text-mate-muted">
        Send the final application to the client for sign-off before lodgement
      </p>

      <Stepper current={step} />

      <div className="mt-8 rounded-2xl border border-mate-border bg-white p-6 shadow-sm md:p-8">
        {step === 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mate-accent">
              Select client &amp; matter
            </p>
            {!selectedClient ? (
              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mate-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by client name, phone, or file number..."
                  className="h-12 w-full rounded-xl border border-mate-border bg-mate-offwhite pl-11 pr-4 text-sm outline-none ring-mate-accent/20 focus:ring-2"
                />
                {(clients.length > 0 || searching) && query.trim() && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-mate-border bg-white shadow-lg">
                    {searching && (
                      <p className="px-4 py-3 text-sm text-mate-muted">Searching...</p>
                    )}
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c)
                          setSelectedMatter(null)
                          setQuery("")
                          setClients([])
                        }}
                        className="flex w-full items-center gap-3 border-b border-mate-border px-4 py-3 text-left hover:bg-mate-offwhite last:border-0"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mate-primary text-xs font-bold text-white">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-mate-primary">{c.name}</span>
                          <span className="block text-xs text-mate-muted">
                            {c.phone || "—"} · {c.email}
                          </span>
                        </span>
                        {(c.matters?.length || 0) > 0 && (
                          <span className="rounded-full bg-mate-accent/10 px-2.5 py-1 text-[10px] font-semibold text-mate-accent">
                            {c.matters!.length} matters
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-mate-grey/80 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mate-primary text-sm font-bold text-white">
                    {initials(selectedClient.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-mate-primary">{selectedClient.name}</p>
                    <p className="text-xs text-mate-muted">
                      {selectedMatter
                        ? `${selectedMatter.fileNumber} · ${selectedMatter.visaSubclass || selectedMatter.matterType}`
                        : "Select a matter below"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null)
                      setSelectedMatter(null)
                      setApprovalId(null)
                    }}
                    className="rounded-lg border border-mate-border px-3 py-1.5 text-xs font-semibold text-mate-muted"
                  >
                    Change
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedClient.matters || []).map((m) => (
                    <button
                      key={`${m.fileSource}-${m.fileId}`}
                      type="button"
                      onClick={() => setSelectedMatter(m)}
                      className={cn(
                        "rounded-full px-4 py-2 text-left text-xs font-semibold transition-colors",
                        selectedMatter?.fileId === m.fileId
                          ? "bg-mate-accent text-white"
                          : "bg-mate-grey text-mate-secondary hover:bg-mate-border/40",
                      )}
                    >
                      <span className="block">{m.fileNumber}</span>
                      <span className="block font-normal opacity-80">
                        {m.visaSubclass || m.matterType}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedMatter && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ReadonlyField label="Client Name" value={selectedClient.name} />
                    <ReadonlyField label="Matter Reference" value={selectedMatter.fileNumber} />
                    <ReadonlyField
                      label="Visa Subclass"
                      value={selectedMatter.visaSubclass || selectedMatter.matterType || "—"}
                    />
                    <ReadonlyField label="Client Email" value={selectedClient.email} />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mate-accent">
              Upload final application
            </p>
            <p className="mt-2 text-sm text-mate-muted">
              Attach the complete, finalised application package the client will review and approve.
            </p>
            {!approval?.application_file_name ? (
              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-mate-border bg-mate-offwhite px-6 py-14 transition-colors hover:border-mate-accent/40">
                <Paperclip className="h-8 w-8 text-mate-muted" />
                <p className="mt-4 text-sm font-semibold text-mate-primary">
                  {uploading ? "Uploading..." : "Drop file here or click to browse"}
                </p>
                <p className="mt-1 text-xs text-mate-muted">PDF, Word document</p>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onUpload(f)
                  }}
                />
              </label>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-mate-border bg-mate-offwhite px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mate-primary text-white">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-mate-primary">
                    {approval.application_file_name}
                  </p>
                  <p className="text-xs text-mate-muted">
                    {formatBytes(approval.application_file_size || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!approvalId) {
                      setApproval((a) =>
                        a ? { ...a, application_file_name: null, application_file_path: null } : a,
                      )
                      return
                    }
                    const res = await fetch(`/api/application-approvals/${approvalId}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clear_file: true }),
                    })
                    const json = await res.json()
                    if (res.ok) setApproval(json.approval)
                  }}
                  className="text-mate-muted hover:text-mate-primary"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mate-accent">
              Covering message
            </p>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-mate-muted">
                Subject line
              </span>
              <input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                onBlur={() => approvalId && saveMessage().catch(() => undefined)}
                className="mt-2 h-11 w-full rounded-xl border border-mate-border px-4 text-sm"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-mate-muted">
                Message to client
              </span>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                onBlur={() => approvalId && saveMessage().catch(() => undefined)}
                rows={8}
                className="mt-2 w-full rounded-xl border border-mate-border px-4 py-3 text-sm leading-relaxed"
              />
            </label>
            <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm italic text-amber-950/80">
              <p className="text-[10px] font-semibold not-italic uppercase tracking-wider text-amber-900/70">
                Client declaration — what the client will sign
              </p>
              <p className="mt-2">
                I confirm that I have carefully reviewed the application attached to this notice. I
                approve the contents of this application and authorise my migration agent to lodge it
                on my behalf.
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <PreviewCard
            clientName={selectedClient?.name || ""}
            clientEmail={selectedClient?.email || ""}
            matterRef={selectedMatter?.fileNumber || ""}
            visaSubclass={selectedMatter?.visaSubclass || ""}
            fileName={approval?.application_file_name || ""}
            subject={messageSubject}
            body={messageBody}
          />
        )}
      </div>

      <div className="mt-6 flex justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-mate-border bg-white px-5 text-sm font-semibold text-mate-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={
            busy ||
            sending ||
            (step === 0 && !selectedMatter) ||
            (step === 1 && !approval?.application_file_path) ||
            (step === 3 && sending)
          }
          onClick={async () => {
            if (step === 0) {
              await ensureDraft()
              setStep(1)
              return
            }
            if (step === 1) {
              setStep(2)
              return
            }
            if (step === 2) {
              await saveMessage()
              setStep(3)
              return
            }
            await onSend()
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-mate-primary px-6 text-sm font-semibold text-white disabled:opacity-40"
        >
          {step === 3 ? (
            <>
              <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send to Client"}
            </>
          ) : (
            <>
              Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mt-8 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-mate-accent text-white",
                  active && !done && "bg-mate-primary text-white",
                  !done && !active && "bg-mate-grey text-mate-muted",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:inline",
                  active ? "text-mate-primary" : "text-mate-muted",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1", done ? "bg-mate-accent" : "bg-mate-border")} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mate-muted">
          {label}
        </span>
        <span className="rounded bg-mate-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-mate-accent">
          AUTO
        </span>
      </div>
      <div className="mt-2 rounded-xl border border-mate-border bg-mate-offwhite px-4 py-3 text-sm font-medium text-mate-primary">
        {value}
      </div>
    </div>
  )
}

function PreviewCard(props: {
  clientName: string
  clientEmail: string
  matterRef: string
  visaSubclass: string
  fileName: string
  subject: string
  body: string
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mate-accent">
        Preview approval notice
      </p>
      <div className="rounded-xl border border-mate-border bg-mate-offwhite p-6 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-[10px] uppercase text-mate-muted">Client</span>
            <p className="font-semibold">{props.clientName}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-mate-muted">Sent to</span>
            <p className="font-semibold">{props.clientEmail}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-mate-muted">Matter</span>
            <p className="font-semibold">{props.matterRef}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-mate-muted">Visa subclass</span>
            <p className="font-semibold">{props.visaSubclass}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-mate-border bg-white px-4 py-3">
          <FileText className="mb-2 h-4 w-4 text-mate-accent" />
          <p className="font-medium">{props.fileName}</p>
        </div>
        <p className="mt-4 font-semibold">{props.subject}</p>
        <p className="mt-2 whitespace-pre-wrap text-mate-secondary">{props.body}</p>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

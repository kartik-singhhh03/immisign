"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { CheckCircle2, FileSignature, Plus } from "lucide-react"
import type { ServiceStatement } from "../types"

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  generated: "Generated",
  sent: "Sent",
  viewed: "Viewed",
  acknowledged: "Acknowledged",
}

export function ServiceStatementPanel({
  clientId,
  workspaceSlug,
  canManage = true,
  agreementId,
  approvalId,
  fileSource,
  fileId,
}: {
  clientId: string
  workspaceSlug: string
  canManage?: boolean
  agreementId?: string | null
  approvalId?: string | null
  fileSource?: 'agreement' | 'application_approval'
  fileId?: string
}) {
  const [statements, setStatements] = React.useState<ServiceStatement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const hasMatterScope = Boolean(
    (fileSource && fileId) || agreementId || approvalId,
  )

  const load = React.useCallback(async () => {
    if (!hasMatterScope) {
      setStatements([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (agreementId) params.set('agreement_id', agreementId)
      if (approvalId) params.set('approval_id', approvalId)
      if (fileSource) params.set('file_source', fileSource)
      if (fileId) params.set('file_id', fileId)
      const qs = params.toString()
      const res = await fetch(
        `/api/clients/${clientId}/service-statements${qs ? `?${qs}` : ''}`,
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setStatements(json.statements || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [clientId, agreementId, approvalId, fileSource, fileId, hasMatterScope])

  React.useEffect(() => {
    load()
  }, [load])

  const acknowledgeStatement = async (statementId: string) => {
    setBusy(`ack-${statementId}`)
    try {
      const res = await fetch(
        `/api/clients/${clientId}/service-statements/${statementId}/acknowledge`,
        { method: "POST" },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Acknowledge failed")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Acknowledge failed")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 font-semibold animate-pulse">
        Loading statements of service…
      </div>
    )
  }

  const newParams = new URLSearchParams({ clientId })
  if (fileSource && fileId) {
    newParams.set("file_source", fileSource)
    newParams.set("file_id", fileId)
  }
  if (agreementId) newParams.set("agreement_id", agreementId)
  if (approvalId) newParams.set("approval_id", approvalId)
  const newHref = `/workspace/${workspaceSlug}/service-statements/new?${newParams.toString()}`

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
          <Button asChild size="sm" className="rounded-xl bg-[#1a3a5c] font-bold hover:bg-[#152e4a]">
            <Link href={newHref}>
              <Plus className="mr-1.5 h-4 w-4" /> New Statement of Service
            </Link>
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      {statements.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="h-8 w-8 text-slate-400" />}
          title="No Statement of Service"
          description={
            hasMatterScope
              ? "No Statement of Service has been issued for this matter yet."
              : "Select a matter to view its Statement of Service records."
          }
          className="min-h-[200px] border-slate-200/60 bg-white/50"
        />
      ) : (
        <ul className="space-y-2">
          {statements.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap justify-between items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
            >
              <div>
                <div className="text-sm font-bold text-[#111111]">
                  {s.statement_number || "Statement of Service"}
                </div>
                <div className="text-xs text-slate-400 font-semibold mt-0.5">
                  {STATUS_LABELS[s.status] || s.status}
                  {s.visa_subclass ? ` · ${s.visa_subclass}` : ""}
                  {s.acknowledged_at
                    ? ` · Acknowledged ${new Date(s.acknowledged_at).toLocaleDateString("en-AU")}`
                    : ""}
                </div>
              </div>
              <div className="flex gap-2">
                {canManage && ["draft", "generated"].includes(s.status) && (
                  <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-bold">
                    <Link href={`/workspace/${workspaceSlug}/service-statements/${s.id}`}>
                      Continue
                    </Link>
                  </Button>
                )}
                {canManage &&
                  ["sent", "viewed"].includes(s.status) &&
                  !s.acknowledged_at && (
                    <Button
                      size="sm"
                      disabled={busy === `ack-${s.id}`}
                      onClick={() => acknowledgeStatement(s.id)}
                      className="rounded-lg text-xs font-bold bg-[#111111] hover:bg-[#222222]"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Record acknowledgement
                    </Button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

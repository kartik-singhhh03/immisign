"use client"

import React, { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Send,
  Shield,
  Upload,
  XCircle,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ApprovalStatusBadge } from "../status-badge"
import type { ApprovalAction } from "../../types"
import { useAuthStore } from "@/store/authStore"
import { uiRoleToDb } from "@/lib/auth/db-roles"

type DetailPayload = {
  approval: Record<string, unknown>
  comments: Record<string, unknown>[]
  attachments: Record<string, unknown>[]
  checklist: Record<string, unknown>[]
  timeline: Record<string, unknown>[]
  userMap: Record<string, string>
}

export function ApprovalDetailPage({
  initial,
  agencySlug,
  agencyId,
}: {
  initial: DetailPayload
  agencySlug: string
  agencyId: string
}) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(initial)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const approval = data.approval as {
    id: string
    approval_number?: string
    title: string
    status: string
    visa_subclass?: string
    matter_reference?: string
    priority?: string
    notes?: string
    internal_notes?: string
    lodgement_deadline?: string
    clients?: { name: string }
    matter_types?: { name: string }
    created_by: string
    assigned_reviewer_id?: string
    assigned_rma_id?: string
  }

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/approvals/${approval.id}`)
    const json = await res.json()
    if (json.success) setData(json)
  }, [approval.id])

  const runTransition = async (action: ApprovalAction, extra?: Record<string, unknown>) => {
    setBusy(action)
    try {
      const res = await fetch(`/api/approvals/${approval.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(null)
    }
  }

  const postComment = async () => {
    if (!comment.trim()) return
    setBusy("comment")
    try {
      const res = await fetch(`/api/approvals/${approval.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setComment("")
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const toggleChecklist = async (itemId: string, completed: boolean) => {
    await fetch(`/api/approvals/${approval.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, is_completed: completed }),
    })
    await refresh()
  }

  const uploadFile = async (file: File) => {
    setBusy("upload")
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch(`/api/approvals/${approval.id}/attachments`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const dbRole = user?.role ? uiRoleToDb(user.role) : "viewer"
  const isOwner = dbRole === "owner"
  const canReview = ["owner", "admin", "manager"].includes(dbRole)

  const checklistDone = data.checklist.filter((c) => c.is_completed).length
  const checklistTotal = data.checklist.length

  return (
    <div className="animate-enter space-y-6 max-w-7xl mx-auto pb-12">
      <Link
        href={`/workspace/${agencySlug}/approvals`}
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to approvals
      </Link>

      <PageHeader
        eyebrow={approval.approval_number || "Application"}
        title={approval.title}
        description={`${approval.clients?.name || "Client"} · ${approval.matter_types?.name || approval.visa_subclass || "Matter"}`}
        action={
          <div className="flex flex-wrap gap-2">
            {approval.status === "draft" && (
              <Button
                disabled={!!busy}
                onClick={() => runTransition("submit")}
                className="rounded-xl bg-[#0D9F8C] font-bold"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Submit for review
              </Button>
            )}
            {approval.status === "submitted" && canReview && (
              <Button variant="outline" disabled={!!busy} onClick={() => runTransition("start_review")}>
                Start review
              </Button>
            )}
            {approval.status === "under_review" && canReview && (
              <>
                <Button variant="outline" disabled={!!busy} onClick={() => {
                  const c = prompt("Describe required changes:")
                  if (c) runTransition("request_changes", { comment: c })
                }}>
                  Request changes
                </Button>
                <Button disabled={!!busy} onClick={() => runTransition("approve")} className="rounded-xl bg-emerald-600 font-bold">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                </Button>
                <Button variant="destructive" disabled={!!busy} onClick={() => runTransition("reject")}>
                  <XCircle className="h-4 w-4 mr-1.5" /> Reject
                </Button>
              </>
            )}
            {approval.status === "changes_requested" && (
              <Button disabled={!!busy} onClick={() => runTransition("resubmit")} className="rounded-xl bg-[#0D9F8C] font-bold">
                Resubmit
              </Button>
            )}
            {approval.status === "approved" && isOwner && (
              <Button disabled={!!busy} onClick={() => runTransition("ready_to_lodge")}>
                Ready to lodge
              </Button>
            )}
            {approval.status === "ready_to_lodge" && isOwner && (
              <Button disabled={!!busy} onClick={() => runTransition("lodged")}>
                Mark lodged
              </Button>
            )}
            {approval.status === "lodged" && isOwner && (
              <Button disabled={!!busy} onClick={() => runTransition("close")}>
                Close matter
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black text-[#081B2E]">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">Status</div>
                <div className="mt-1"><ApprovalStatusBadge status={approval.status} /></div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">Priority</div>
                <div className="font-semibold capitalize">{approval.priority || "normal"}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">Due date</div>
                <div className="font-semibold">
                  {approval.lodgement_deadline
                    ? new Date(approval.lodgement_deadline).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">Matter ref</div>
                <div className="font-semibold">{approval.matter_reference || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">Checklist</div>
                <div className="font-semibold text-[#0D9F8C]">
                  {checklistDone}/{checklistTotal} complete
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#0D9F8C]" /> Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {data.checklist.map((item) => (
                <label
                  key={item.id as string}
                  className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.is_completed)}
                    onChange={(e) => toggleChecklist(item.id as string, e.target.checked)}
                    className="mt-1"
                  />
                  <span className={`text-xs font-semibold ${item.is_completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {item.label as string}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <FileText className="h-4 w-4" /> Attachments
              </CardTitle>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadFile(f)
                  }}
                />
                <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold" disabled={busy === "upload"}>
                  <Upload className="h-3 w-3 mr-1" /> Upload
                </Button>
              </label>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {data.attachments.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No attachments yet.</p>
              ) : (
                data.attachments.map((att) => (
                  <div key={att.id as string} className="py-3 flex justify-between items-center gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{att.file_name as string}</p>
                      <p className="text-xs text-slate-400">
                        v{att.version_number as number} · {data.userMap[att.uploaded_by as string] || "User"}
                      </p>
                    </div>
                    {att.is_current && (
                      <span className="text-[10px] font-bold uppercase text-emerald-600">Current</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-3">
                {data.comments.map((c) => (
                  <div key={c.id as string} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 mb-1">
                      {data.userMap[c.author_id as string] || c.author_role as string} ·{" "}
                      {new Date(c.created_at as string).toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-800">{c.content as string}</p>
                  </div>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add internal comment… Use @name in text for mentions."
                className="rounded-xl min-h-[80px]"
              />
              <Button
                onClick={postComment}
                disabled={busy === "comment" || !comment.trim()}
                className="rounded-xl bg-[#0D9F8C] font-bold w-full"
              >
                Post comment
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm h-full max-h-[720px] flex flex-col">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Clock className="h-4 w-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="relative space-y-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {data.timeline.length === 0 ? (
                  <p className="text-sm text-slate-500 pl-6">No activity yet.</p>
                ) : (
                  data.timeline.map((log) => (
                    <div key={log.id as string} className="flex gap-4 relative">
                      <div className="h-4 w-4 rounded-full bg-[#0D9F8C] ring-2 ring-white z-10 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-[#081B2E]">{log.title as string}</p>
                        {log.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{log.description as string}</p>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          {new Date(log.created_at as string).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

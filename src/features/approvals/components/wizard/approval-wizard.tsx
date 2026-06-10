"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImmiMateCard } from "@/components/ui/immimate-card"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  ImmiMateInput,
  ImmiMateTextarea,
  ImmiMateDatePicker,
  ImmiMateSelect,
  ImmiMateSelectContent,
  ImmiMateSelectItem,
  ImmiMateSelectTrigger,
  ImmiMateSelectValue,
} from "@/components/ui/immimate-form"
import { createApprovalAction } from "@/features/approvals/actions/approvals"

export function ApprovalWizard({
  agencyId,
  agencySlug,
  clients,
  matterTypes,
  initialClientId,
}: {
  agencyId: string
  agencySlug: string
  clients: { id: string; name: string }[]
  matterTypes: { id: string; name: string }[]
  initialClientId?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    client_id: initialClientId || "",
    visa_subclass: "",
    matter_type_id: "",
    matter_reference: "",
    priority: "normal",
    notes: "",
    internal_notes: "",
    lodgement_deadline: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      alert("Title is required")
      return
    }
    setSaving(true)
    try {
      const approval = await createApprovalAction({
        agencyId,
        title: form.title,
        client_id: form.client_id || null,
        visa_subclass: form.visa_subclass || null,
        matter_type_id: form.matter_type_id || null,
        matter_reference: form.matter_reference || null,
        priority: form.priority,
        notes: form.notes || null,
        internal_notes: form.internal_notes || null,
        lodgement_deadline: form.lodgement_deadline || null,
      })
      router.push(`/workspace/${agencySlug}/approvals/${approval.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create approval")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-enter max-w-2xl mx-auto py-8">
      <Link
        href={`/workspace/${agencySlug}/approvals`}
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Approvals
      </Link>

      <PageHeader
        className="mb-6 border-0 pb-0"
        eyebrow="Approvals"
        title="New Application Approval"
        description="Create an internal review record. Upload documents from the detail page after creation."
      />

      <ImmiMateCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Application title *</label>
            <ImmiMateInput
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Partner visa lodgement — Smith"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Client</label>
            <ImmiMateSelect value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <ImmiMateSelectTrigger>
                <ImmiMateSelectValue placeholder="Select client" />
              </ImmiMateSelectTrigger>
              <ImmiMateSelectContent>
                {clients.map((c) => (
                  <ImmiMateSelectItem key={c.id} value={c.id}>{c.name}</ImmiMateSelectItem>
                ))}
              </ImmiMateSelectContent>
            </ImmiMateSelect>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Matter type</label>
              <ImmiMateSelect value={form.matter_type_id} onValueChange={(v) => setForm({ ...form, matter_type_id: v })}>
                <ImmiMateSelectTrigger>
                  <ImmiMateSelectValue placeholder="Matter type" />
                </ImmiMateSelectTrigger>
                <ImmiMateSelectContent>
                  {matterTypes.map((m) => (
                    <ImmiMateSelectItem key={m.id} value={m.id}>{m.name}</ImmiMateSelectItem>
                  ))}
                </ImmiMateSelectContent>
              </ImmiMateSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Visa subclass</label>
              <ImmiMateInput
                value={form.visa_subclass}
                onChange={(e) => setForm({ ...form, visa_subclass: e.target.value })}
                placeholder="e.g. 820"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Matter reference</label>
            <ImmiMateInput
              value={form.matter_reference}
              onChange={(e) => setForm({ ...form, matter_reference: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Priority</label>
              <ImmiMateSelect value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <ImmiMateSelectTrigger>
                  <ImmiMateSelectValue />
                </ImmiMateSelectTrigger>
                <ImmiMateSelectContent>
                  <ImmiMateSelectItem value="low">Low</ImmiMateSelectItem>
                  <ImmiMateSelectItem value="normal">Normal</ImmiMateSelectItem>
                  <ImmiMateSelectItem value="high">High</ImmiMateSelectItem>
                  <ImmiMateSelectItem value="urgent">Urgent</ImmiMateSelectItem>
                </ImmiMateSelectContent>
              </ImmiMateSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Due date</label>
              <ImmiMateDatePicker
                value={form.lodgement_deadline}
                onChange={(e) => setForm({ ...form, lodgement_deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes</label>
            <ImmiMateTextarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Internal notes</label>
            <ImmiMateTextarea
              value={form.internal_notes}
              onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#111111] font-bold"
          >
            {saving ? "Creating…" : (
              <>
                <FileText className="h-4 w-4 mr-2" /> Create approval
              </>
            )}
          </Button>
        </form>
      </ImmiMateCard>
    </div>
  )
}

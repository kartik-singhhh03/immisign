"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createApprovalAction } from "@/features/approvals/actions/approvals"

export function ApprovalWizard({
  agencyId,
  agencySlug,
  clients,
  matterTypes,
}: {
  agencyId: string
  agencySlug: string
  clients: { id: string; name: string }[]
  matterTypes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    client_id: "",
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

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">New Application Approval</h1>
        <p className="mt-2 text-slate-500 font-medium">
          Create an internal review record. Upload documents from the detail page after creation.
        </p>
      </div>

      <Card className="border-slate-200/60 shadow-sm rounded-2xl bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Application title *</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-xl h-11"
              placeholder="e.g. Partner visa lodgement — Smith"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Client</label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Matter type</label>
              <Select value={form.matter_type_id} onValueChange={(v) => setForm({ ...form, matter_type_id: v })}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Matter type" />
                </SelectTrigger>
                <SelectContent>
                  {matterTypes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Visa subclass</label>
              <Input
                value={form.visa_subclass}
                onChange={(e) => setForm({ ...form, visa_subclass: e.target.value })}
                className="rounded-xl h-11"
                placeholder="e.g. 820"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Matter reference</label>
            <Input
              value={form.matter_reference}
              onChange={(e) => setForm({ ...form, matter_reference: e.target.value })}
              className="rounded-xl h-11"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Priority</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Due date</label>
              <Input
                type="date"
                value={form.lodgement_deadline}
                onChange={(e) => setForm({ ...form, lodgement_deadline: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Internal notes</label>
            <Textarea
              value={form.internal_notes}
              onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#0D9F8C] font-bold"
          >
            {saving ? "Creating…" : (
              <>
                <FileText className="h-4 w-4 mr-2" /> Create approval
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

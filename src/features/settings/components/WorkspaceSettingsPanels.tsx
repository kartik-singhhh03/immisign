"use client"

import * as React from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { DigitsInput } from "@/components/ui/digits-input"
import { parseOrThrow } from "@/lib/validations/fields"
import { agencyProfileSaveSchema } from "@/lib/validations/schemas"
import { Textarea } from "@/components/ui/textarea"

type ListEditorProps = {
  items: Array<{ id: string; label: string }>
  loading?: boolean
  placeholder: string
  disabled?: boolean
  onAdd: (label: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SettingsListEditor({ items, loading, placeholder, disabled, onAdd, onDelete }: ListEditorProps) {
  const [newValue, setNewValue] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const handleAdd = async () => {
    if (!newValue.trim()) return
    setSaving(true)
    try {
      await onAdd(newValue.trim())
      setNewValue("")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Input value={item.label} readOnly className="h-10 border-0 shadow-none focus-visible:ring-0" />
          {!disabled && (
            <button type="button" onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="h-11 rounded-xl border-slate-200"
          />
          <Button type="button" onClick={handleAdd} disabled={saving} className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}
    </div>
  )
}

export function AgencyProfilePanel({
  agencyProfile,
  disabled,
  onSave,
}: {
  agencyProfile: any
  disabled?: boolean
  onSave: (updates: Record<string, unknown>) => Promise<void>
}) {
  const [phone, setPhone] = React.useState(agencyProfile?.phone || "")
  const [marn, setMarn] = React.useState(agencyProfile?.marn || "")

  React.useEffect(() => {
    setPhone(agencyProfile?.phone || "")
    setMarn(agencyProfile?.marn || "")
  }, [agencyProfile?.phone, agencyProfile?.marn])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = parseOrThrow(agencyProfileSaveSchema, {
      name: String(fd.get("name") || ""),
      principal_name: String(fd.get("principal_name") || ""),
      marn,
      email: String(fd.get("email") || "") || null,
      phone: phone || null,
      website: String(fd.get("website") || "") || null,
      address: String(fd.get("address") || "") || null,
    })
    await onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Agency Name *
          <Input name="name" required defaultValue={agencyProfile?.name || ""} disabled={disabled} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Agent Name *
          <Input name="principal_name" required defaultValue={agencyProfile?.principal_name || ""} disabled={disabled} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          MARN *
          <DigitsInput value={marn} onChange={setMarn} maxDigits={7} required disabled={disabled} className="h-11 rounded-xl" placeholder="1234567" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Email
          <Input name="email" type="email" defaultValue={agencyProfile?.email || ""} disabled={disabled} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Phone
          <PhoneInput value={phone} onChange={setPhone} disabled={disabled} className="h-11 rounded-xl" placeholder="+61 400 000 000" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Website
          <Input name="website" defaultValue={agencyProfile?.website || ""} disabled={disabled} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Address
          <Input name="address" defaultValue={agencyProfile?.address || ""} disabled={disabled} className="h-11 rounded-xl" />
        </label>
      </div>
      {!disabled && (
        <Button type="submit" className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">Save Settings</Button>
      )}
    </form>
  )
}

function RmaSignatureEditor({
  rma,
  disabled,
  onSave,
}: {
  rma: { id: string; signature_mode?: string | null; signature_text?: string | null }
  disabled?: boolean
  onSave: (rmaId: string, payload: { signature_mode: 'upload' | 'typed'; signature_text?: string; file?: File }) => Promise<void>
}) {
  const [mode, setMode] = React.useState<'upload' | 'typed'>(
    rma.signature_mode === 'upload' ? 'upload' : 'typed',
  )
  const [typedText, setTypedText] = React.useState(rma.signature_text || '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setMode(rma.signature_mode === 'upload' ? 'upload' : 'typed')
    setTypedText(rma.signature_text || '')
  }, [rma.id, rma.signature_mode, rma.signature_text])

  const handleSave = async (file?: File) => {
    setSaving(true)
    try {
      await onSave(rma.id, {
        signature_mode: mode,
        signature_text: mode === 'typed' ? typedText : undefined,
        file,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signature (auto-applied on send)</div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('typed')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'typed' ? 'bg-[#111111] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          Typed Signature
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('upload')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'upload' ? 'bg-[#111111] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          Uploaded Signature
        </button>
      </div>
      {mode === 'typed' ? (
        <div className="space-y-2">
          <Input
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Signature as typed name"
            disabled={disabled}
            className="h-10 rounded-lg text-sm font-semibold"
            style={{ fontFamily: "'Brush Script MT', cursive" }}
          />
          <Button type="button" size="sm" disabled={disabled || saving} onClick={() => void handleSave()} className="rounded-lg bg-[#111111] text-xs font-bold">
            {saving ? 'Saving...' : 'Save typed signature'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            className="text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleSave(f)
            }}
          />
          {rma.signature_mode === 'upload' && (
            <p className="text-[10px] text-[#111111] font-semibold">Uploaded signature on file</p>
          )}
        </div>
      )}
    </div>
  )
}

export function RmaTeamPanel({
  rmas,
  teamMembers,
  loading,
  disabled,
  onSetDefault,
  onSetStatus,
  onRemove,
  onUpsert,
  onSaveSignature,
}: {
  rmas: any[]
  teamMembers: any[]
  loading?: boolean
  disabled?: boolean
  onSetDefault: (id: string) => Promise<void>
  onSetStatus: (id: string, status: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onUpsert: (payload: { user_id: string; mara_number: string; phone?: string; rma_tier?: string }) => Promise<void>
  onSaveSignature: (rmaId: string, payload: { signature_mode: 'upload' | 'typed'; signature_text?: string; file?: File }) => Promise<void>
}) {
  const [selectedUserId, setSelectedUserId] = React.useState("")
  const [marn, setMarn] = React.useState("")
  const [phone, setPhone] = React.useState("")

  const handleAdd = async () => {
    if (!selectedUserId || !marn.trim()) return
    await onUpsert({ user_id: selectedUserId, mara_number: marn.trim(), phone: phone.trim() || undefined })
    setSelectedUserId("")
    setMarn("")
    setPhone("")
  }

  const membersWithoutRma = teamMembers.filter((m) => !rmas.some((r) => r.user_id === m.id))

  return (
    <div className="space-y-6">
      {!disabled && membersWithoutRma.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-bold text-[#111111]">Add RMA</h4>
          <div className="grid gap-3 md:grid-cols-4">
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
              <option value="">Select team member...</option>
              {membersWithoutRma.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <DigitsInput value={marn} onChange={setMarn} maxDigits={7} placeholder="MARN (7 digits)" className="h-11 rounded-xl" />
            <PhoneInput value={phone} onChange={setPhone} placeholder="Phone" className="h-11 rounded-xl" />
            <Button type="button" onClick={handleAdd} className="rounded-xl bg-[#111111] font-bold"><Plus className="h-4 w-4 mr-1" /> Add RMA</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading RMA team...</p>
      ) : (
        <div className="space-y-3">
          {rmas.map((rma) => (
            <div key={rma.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-[#111111]">{rma.users?.full_name}</div>
                  <div className="text-xs text-slate-500 mt-1">MARN: {rma.mara_number} · {rma.users?.email}</div>
                  {rma.phone && <div className="text-xs text-slate-500">{rma.phone}</div>}
                  <div className="flex gap-2 mt-2">
                    {rma.is_default && <span className="rounded bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-bold text-[#111111]">Default</span>}
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize">{rma.rma_tier || "associate"}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold capitalize ${rma.rma_status === "active" ? "bg-[#FAFAFA] text-[#111111]" : "bg-slate-100 text-slate-600"}`}>
                      {rma.rma_status || "active"}
                    </span>
                  </div>
                </div>
                {!disabled && (
                  <div className="flex flex-wrap gap-2">
                    {!rma.is_default && (
                      <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => onSetDefault(rma.id)}>Set Default</Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => onSetStatus(rma.id, rma.rma_status === "active" ? "inactive" : "active")}
                    >
                      {rma.rma_status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs text-red-600" onClick={() => onRemove(rma.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                )}
              </div>
              <RmaSignatureEditor rma={rma} disabled={disabled} onSave={onSaveSignature} />
            </div>
          ))}
          {rmas.length === 0 && <p className="text-sm text-slate-500">No RMA records yet. Add practitioners from your team.</p>}
        </div>
      )}
    </div>
  )
}

export function FinancialSettingsPanel({
  defaults,
  disabled,
  onSave,
}: {
  defaults: any
  disabled?: boolean
  onSave: (updates: Record<string, unknown>) => Promise<void>
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = String(fd.get("surcharge") || "").trim()
    await onSave({
      card_processing_surcharge_percent: raw === "" ? null : parseFloat(raw),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <label className="grid gap-2 text-xs font-bold text-slate-500">
        Card Processing Surcharge %
        <p className="text-[11px] font-normal text-slate-400">
          Applied to visa/government fees during client onboarding. Leave empty until your agency configures a rate.
        </p>
        <Input
          name="surcharge"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Not configured"
          defaultValue={defaults?.card_processing_surcharge_percent ?? ""}
          disabled={disabled}
          className="h-11 rounded-xl"
        />
      </label>
      {!disabled && (
        <Button type="submit" className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">
          Save Financial Settings
        </Button>
      )}
    </form>
  )
}

export function DefaultsPanel({
  defaults,
  disabled,
  onSave,
}: {
  defaults: any
  disabled?: boolean
  onSave: (updates: Record<string, unknown>) => Promise<void>
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await onSave({
      default_scope_of_services: fd.get("scope"),
      default_special_terms: fd.get("special"),
      default_professional_fee: parseFloat(String(fd.get("fee") || "0")) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="grid gap-2 text-xs font-bold text-slate-500">
        Default Scope of Services
        <p className="text-[11px] font-normal text-slate-400">Pre-fills the scope box on every new agreement. Edit per matter.</p>
        <Textarea name="scope" defaultValue={defaults?.default_scope_of_services || ""} disabled={disabled} className="min-h-[140px] rounded-xl" />
      </label>
      <label className="grid gap-2 text-xs font-bold text-slate-500">
        Default Special Terms
        <p className="text-[11px] font-normal text-slate-400">Appears in every agreement. Override per matter.</p>
        <Textarea name="special" defaultValue={defaults?.default_special_terms || ""} disabled={disabled} placeholder="e.g. Out-of-scope work will be quoted separately..." className="min-h-[100px] rounded-xl" />
      </label>
      <label className="grid gap-2 text-xs font-bold text-slate-500 md:max-w-xs">
        Default Professional Fee ($)
        <Input name="fee" type="number" step="0.01" defaultValue={defaults?.default_professional_fee || 0} disabled={disabled} className="h-11 rounded-xl" />
      </label>
      {!disabled && <Button type="submit" className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">Save Settings</Button>}
    </form>
  )
}

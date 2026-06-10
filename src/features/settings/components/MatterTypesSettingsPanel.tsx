"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsListEditor } from "./WorkspaceSettingsPanels"

type MatterTypeRow = {
  id: string
  name: string
  subclass_placeholder?: string
  show_secondary_applicant?: boolean
  show_sponsor?: boolean
  show_dependants?: boolean
}

type FieldRow = {
  id: string
  field_key: string
  label: string
  field_type: string
  required: boolean
  placeholder?: string
  col_span?: number
}

type Props = {
  matterTypes: MatterTypeRow[]
  loading?: boolean
  disabled?: boolean
  onAddMatterType: (name: string) => Promise<void>
  onDeleteMatterType: (id: string) => Promise<void>
  onLoadFields: (matterTypeId: string) => Promise<FieldRow[]>
  onAddField: (matterTypeId: string, field: { field_key: string; label: string; field_type?: string; required?: boolean }) => Promise<void>
  onDeleteField: (fieldId: string) => Promise<void>
  onToast: (msg: string) => void
}

export function MatterTypesSettingsPanel({
  matterTypes,
  loading,
  disabled,
  onAddMatterType,
  onDeleteMatterType,
  onLoadFields,
  onAddField,
  onDeleteField,
  onToast,
}: Props) {
  const [selectedId, setSelectedId] = React.useState<string>("")
  const [fields, setFields] = React.useState<FieldRow[]>([])
  const [fieldsLoading, setFieldsLoading] = React.useState(false)
  const [newFieldKey, setNewFieldKey] = React.useState("")
  const [newFieldLabel, setNewFieldLabel] = React.useState("")
  const [newFieldType, setNewFieldType] = React.useState("text")

  React.useEffect(() => {
    if (!selectedId) {
      setFields([])
      return
    }
    setFieldsLoading(true)
    onLoadFields(selectedId)
      .then(setFields)
      .finally(() => setFieldsLoading(false))
  }, [selectedId, onLoadFields])

  const handleAddField = async () => {
    if (!selectedId || !newFieldKey.trim() || !newFieldLabel.trim()) return
    await onAddField(selectedId, {
      field_key: newFieldKey.trim().replace(/\s+/g, '_').toLowerCase(),
      label: newFieldLabel.trim(),
      field_type: newFieldType,
    })
    setNewFieldKey("")
    setNewFieldLabel("")
    const refreshed = await onLoadFields(selectedId)
    setFields(refreshed)
    onToast("Custom field added")
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 font-semibold">
        Manage visa matter categories and custom fields used in the Agreement Wizard.
      </p>
      <SettingsListEditor
        items={matterTypes.map((m) => ({ id: m.id, label: m.name }))}
        loading={loading}
        placeholder="Add new matter type..."
        disabled={disabled}
        onAdd={async (label) => { await onAddMatterType(label); onToast("Matter type added") }}
        onDelete={async (id) => {
          await onDeleteMatterType(id)
          if (selectedId === id) setSelectedId("")
          onToast("Matter type removed")
        }}
      />

      {matterTypes.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Configure fields for matter type
            <select
              disabled={disabled}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              <option value="">Select matter type...</option>
              {matterTypes.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          {selectedId && (
            <>
              {fieldsLoading ? (
                <p className="text-xs text-slate-400">Loading fields...</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                      <div>
                        <span className="font-bold text-[#111111]">{f.label}</span>
                        <span className="text-slate-400 ml-2">({f.field_type})</span>
                        {f.required && <span className="text-rose-500 ml-1">*</span>}
                      </div>
                      {!disabled && (
                        <button type="button" onClick={async () => {
                          await onDeleteField(f.id)
                          setFields(await onLoadFields(selectedId))
                          onToast("Field removed")
                        }} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!fields.length && <p className="text-xs text-slate-400">No custom fields yet.</p>}
                </div>
              )}

              {!disabled && (
                <div className="grid gap-3 md:grid-cols-4 pt-2 border-t border-slate-100">
                  <Input
                    placeholder="field_key"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                  <Input
                    placeholder="Field label"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-2 text-xs"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <Button type="button" onClick={handleAddField} className="h-10 rounded-xl bg-[#111111] text-xs font-bold">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

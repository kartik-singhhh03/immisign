"use client"

import * as React from "react"
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsWorkflowModal } from "@/components/settings/SettingsWorkflowModal"
import type { MatterTypeConfig } from "@/lib/settings/types"

type ApiMatterType = {
  id: string
  name: string
  sort_order?: number
  is_active?: boolean
  archived_at?: string | null
  subclass_placeholder?: string
  show_secondary_applicant?: boolean
  show_sponsor?: boolean
  show_dependants?: boolean
}

function toConfig(row: ApiMatterType): MatterTypeConfig {
  return {
    id: row.id,
    name: row.name,
    subclassPlaceholder: row.subclass_placeholder || undefined,
    showSecondaryApplicant: Boolean(row.show_secondary_applicant),
    showSponsor: Boolean(row.show_sponsor),
    showDependants: Boolean(row.show_dependants),
    isActive: row.is_active !== false,
    archivedAt: row.archived_at || null,
    sortOrder: row.sort_order ?? 0,
    fields: [],
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (matterTypes: MatterTypeConfig[], selectedId?: string) => void
}

export function MatterTypesWorkflowModal({ open, onOpenChange, onSaved }: Props) {
  const [rows, setRows] = React.useState<ApiMatterType[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [showArchived, setShowArchived] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/settings/matter-types?includeArchived=${showArchived ? '1' : '0'}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.matterTypes || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load matter types')
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  const activeRows = rows.filter((r) => !r.archived_at)
  const archivedRows = rows.filter((r) => r.archived_at)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/matter-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Create failed')
      setNewName("")
      const resList = await fetch('/api/settings/matter-types')
      const listJson = await resList.json()
      const fresh = (listJson.matterTypes || []).filter((r: ApiMatterType) => !r.archived_at).map(toConfig)
      setRows(listJson.matterTypes || [])
      onSaved(fresh, json.matterType.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (id: string) => {
    const name = editName.trim()
    if (!name) return
    setSaving(true)
    try {
      const res = await fetch(`/api/settings/matter-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setEditingId(null)
      await load()
      onSaved(rows.filter((r) => !r.archived_at).map(toConfig))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const patchAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/settings/matter-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      await load()
      const list = (json.matterTypes || rows).filter((r: ApiMatterType) => !r.archived_at).map(toConfig)
      onSaved(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const moveRow = async (id: string, direction: -1 | 1) => {
    const list = [...activeRows]
    const idx = list.findIndex((r) => r.id === id)
    if (idx < 0) return
    const swap = idx + direction
    if (swap < 0 || swap >= list.length) return
    ;[list[idx], list[swap]] = [list[swap], list[idx]]
    await patchAction(id, 'reorder', { orderedIds: list.map((r) => r.id) })
  }

  const toggleActive = async (row: ApiMatterType) => {
    const res = await fetch(`/api/settings/matter-types/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Toggle failed')
      return
    }
    await load()
    onSaved(activeRows.map(toConfig))
  }

  const renderRow = (row: ApiMatterType, archived = false) => (
    <div
      key={row.id}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#fafbfc] px-3 py-2.5"
    >
      <div className="flex-1 min-w-0">
        {editingId === row.id ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-9 rounded-lg text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(row.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111111] truncate">{row.name}</span>
            {!archived && row.is_active === false && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
        )}
      </div>
      {!archived && (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => moveRow(row.id, -1)} className="p-1.5 text-slate-400 hover:text-[#111111]" title="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => moveRow(row.id, 1)} className="p-1.5 text-slate-400 hover:text-[#111111]" title="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setEditingId(row.id); setEditName(row.name) }}
            className="p-1.5 text-slate-400 hover:text-[#111111]"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => toggleActive(row)} className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500 hover:text-[#111111]">
            {row.is_active === false ? 'Activate' : 'Deactivate'}
          </button>
          <button type="button" onClick={() => patchAction(row.id, 'archive')} className="p-1.5 text-slate-400 hover:text-rose-600" title="Archive">
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {archived && (
        <button type="button" onClick={() => patchAction(row.id, 'restore')} className="inline-flex items-center gap-1 text-xs font-bold text-[#111111]">
          <ArchiveRestore className="h-3.5 w-3.5" /> Restore
        </button>
      )}
      {editingId === row.id && (
        <Button size="sm" className="h-8 rounded-lg" disabled={saving} onClick={() => handleRename(row.id)}>
          Save
        </Button>
      )}
    </div>
  )

  return (
    <SettingsWorkflowModal
      open={open}
      onOpenChange={onOpenChange}
      title="Matter Types"
      description="Create and manage matter types without leaving the agreement wizard."
      size="lg"
    >
      <div className="space-y-5">
        {error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="New matter type name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-11 rounded-xl border-slate-200"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            className="h-11 rounded-xl bg-[#111111] hover:bg-[#222222] shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading matter types…</p>
        ) : (
          <div className="space-y-2">
            {activeRows.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No active matter types yet.</p>
            ) : (
              activeRows.map((row) => renderRow(row))
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived matter types
        </label>

        {showArchived && archivedRows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Archived</p>
            {archivedRows.map((row) => renderRow(row, true))}
          </div>
        )}
      </div>
    </SettingsWorkflowModal>
  )
}

"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { TimelineSkeleton } from "@/components/ui/skeletons"
import { cn } from "@/lib/utils"
import { ArrowDown, Clock, Download, FileText, Keyboard, Search, StickyNote } from "lucide-react"
import { APP_NAME } from "@/lib/brand"
import {
  formatNoteTypeLabel,
  formatTimelineTimestamp,
} from "../lib/format"
import { resolveNoteTypeIcon } from "../lib/note-type-icons"
import type { ClientFile } from "../services/client-files.service"
import type { FileNote, NoteTypeRecord } from "../types"
import { ClientSearchInput, type ClientSearchResult } from "./ClientSearchInput"

type FilterId = "all" | string

function clientInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function isRecentNote(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 5 * 60_000
}

function FileNotesPanel({
  title,
  subtitle,
  children,
  className,
  stagger,
  "aria-label": ariaLabel,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  stagger?: number
  "aria-label"?: string
}) {
  return (
    <div
      className={cn(
        "immimate-panel min-h-[340px] animate-enter",
        className,
      )}
      style={stagger ? { animationDelay: `${stagger}ms` } : undefined}
      aria-label={ariaLabel}
    >
      <div className="immimate-panel-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-[#5C5C5C]/80 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="immimate-panel-body">{children}</div>
    </div>
  )
}

function GuidanceItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#E7E7E7]/80 bg-[#FAFAFA]/60 px-4 py-3.5 transition-colors duration-200 hover:border-[#111111]/12 hover:bg-[#FAFAFA]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#E7E7E7] shadow-sm">
        <Icon className="h-4 w-4 text-[#111111]" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-[#111111]">{title}</p>
        <p className="text-xs text-[#5C5C5C] mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function InlineEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E7E7] bg-[#FAFAFA]/40 px-6 py-10 text-center min-h-[200px]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#E7E7E7] shadow-sm">
        <Icon className="h-5 w-5 text-[#5C5C5C]" />
      </div>
      <p className="section-title">{title}</p>
      <p className="mt-2 max-w-xs text-sm font-medium text-[#5C5C5C] leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export function FileNotesWorkspace({
  initialClient,
  initialFileSource,
  initialFileId,
  canAdd = true,
  showPageHeader = false,
}: {
  initialClient?: ClientSearchResult | null
  initialFileSource?: ClientFile["source"]
  initialFileId?: string
  canAdd?: boolean
  showPageHeader?: boolean
}) {
  const [client, setClient] = React.useState<ClientSearchResult | null>(
    initialClient ?? null,
  )
  const [files, setFiles] = React.useState<ClientFile[]>([])
  const [selectedFile, setSelectedFile] = React.useState<ClientFile | null>(null)
  const [noteTypes, setNoteTypes] = React.useState<NoteTypeRecord[]>([])
  const [manualTypes, setManualTypes] = React.useState<NoteTypeRecord[]>([])
  const [notes, setNotes] = React.useState<FileNote[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingFiles, setLoadingFiles] = React.useState(false)
  const [loadingNotes, setLoadingNotes] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [noteType, setNoteType] = React.useState<string>("phone")
  const [body, setBody] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [filter, setFilter] = React.useState<FilterId>("all")
  const [highlightId, setHighlightId] = React.useState<string | null>(null)
  const [pendingFile, setPendingFile] = React.useState<{
    source: ClientFile["source"]
    id: string
  } | null>(null)

  React.useEffect(() => {
    fetch("/api/note-types")
      .then((r) => r.json())
      .then((json) => {
        if (json.noteTypes) {
          setNoteTypes(json.noteTypes)
          const manual = json.noteTypes.filter((t: NoteTypeRecord) => t.is_manual)
          setManualTypes(manual)
          if (manual.length > 0) setNoteType(manual[0].code)
        }
      })
      .catch(() => setError("Failed to load note types"))
  }, [])

  const loadFiles = React.useCallback(async (clientId: string) => {
    setLoadingFiles(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/files`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load files")
      const list: ClientFile[] = json.files || []
      setFiles(list)
      const presetSource = pendingFile?.source || initialFileSource
      const presetId = pendingFile?.id || initialFileId
      if (presetSource && presetId) {
        const preset = list.find((f) => f.source === presetSource && f.id === presetId)
        setSelectedFile(preset || (list.length === 1 ? list[0] : null))
        if (pendingFile) setPendingFile(null)
      } else if (list.length === 1) {
        setSelectedFile(list[0])
      } else {
        setSelectedFile(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load files")
      setFiles([])
      setSelectedFile(null)
    } finally {
      setLoadingFiles(false)
    }
  }, [initialFileSource, initialFileId, pendingFile])

  React.useEffect(() => {
    if (client?.id) {
      loadFiles(client.id)
    } else {
      setFiles([])
      setSelectedFile(null)
    }
  }, [client?.id, loadFiles])

  React.useEffect(() => {
    if (!initialFileSource || !initialFileId || !files.length) return
    const preset = files.find((f) => f.source === initialFileSource && f.id === initialFileId)
    if (preset) setSelectedFile(preset)
  }, [initialFileSource, initialFileId, files])

  const loadNotes = React.useCallback(
    async (opts?: { append?: boolean; nextPage?: number }) => {
      if (!client?.id || !selectedFile) return
      const targetPage = opts?.nextPage ?? 1
      const append = opts?.append ?? false
      if (append) setLoadingMore(true)
      else setLoadingNotes(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          file_source: selectedFile.source,
          file_id: selectedFile.id,
          page: String(targetPage),
          limit: "20",
        })
        if (filter !== "all") params.set("note_type", filter)
        const res = await fetch(`/api/clients/${client.id}/file-notes?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to load notes")
        const incoming: FileNote[] = json.notes || []
        setNotes((prev) => (append ? [...prev, ...incoming] : incoming))
        setTotal(json.total ?? incoming.length)
        setPage(json.page ?? targetPage)
        setHasMore(Boolean(json.has_more))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load notes")
      } finally {
        setLoadingNotes(false)
        setLoadingMore(false)
      }
    },
    [client?.id, selectedFile, filter],
  )

  React.useEffect(() => {
    if (selectedFile) {
      loadNotes()
    } else {
      setNotes([])
      setTotal(0)
    }
  }, [selectedFile, filter, loadNotes])

  const handleClientChange = (c: ClientSearchResult | null) => {
    setClient(c)
    setSelectedFile(null)
    setBody("")
    setFilter("all")
  }

  const submitNote = async () => {
    if (!client?.id || !selectedFile || !body.trim() || saving) return
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`/api/clients/${client.id}/file-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_type: noteType,
          body,
          file_source: selectedFile.source,
          file_id: selectedFile.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save note")
      setBody("")
      if (json.note?.id) setHighlightId(json.note.id)
      await loadNotes()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitNote()
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    void submitNote()
  }

  const handleExport = async () => {
    if (!client?.id || !selectedFile) return
    try {
      setExporting(true)
      setError(null)
      const params = new URLSearchParams({
        file_source: selectedFile.source,
        file_id: selectedFile.id,
      })
      const res = await fetch(
        `/api/clients/${client.id}/file-notes/export?${params}`,
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Export failed")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="([^"]+)"/)
      const filename = match?.[1] || `FileNotes_${selectedFile.file_number}_${new Date().toISOString().slice(0, 10)}.txt`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const filterOptions: { id: FilterId; label: string; type?: NoteTypeRecord }[] = [
    { id: "all", label: "All" },
    ...manualTypes.map((t) => ({ id: t.code, label: t.label, type: t })),
  ]

  const canSubmit = Boolean(
    canAdd && client && selectedFile && body.trim() && !saving,
  )

  const matterKey = client && selectedFile ? `${client.id}:${selectedFile.source}:${selectedFile.id}` : "idle"

  return (
    <div className="space-y-8">
      {showPageHeader && (
        <PageHeader
          eyebrow="Compliance"
          title="File Notes"
          description="Append-only · Auto-timestamped · Audit-ready case notes for every matter."
        />
      )}

      <div className="grid gap-5 lg:grid-cols-12 lg:items-stretch">
        <aside className="lg:col-span-4">
          <FileNotesPanel
            title="Client & Matter"
            subtitle="Search by name, file number, or visa"
            stagger={0}
            className="min-h-[400px]"
            aria-label="Client and matter search"
          >
            <div className="space-y-4">
              <ClientSearchInput
                selected={client}
                onSelect={handleClientChange}
                navigateOnSelect={false}
                minChars={1}
                placeholder="Search client or matter…"
                onMatterSelect={(matter) => {
                  handleClientChange({
                    id: matter.clientId,
                    name: matter.clientName,
                    email: matter.clientEmail,
                    active_file_count: 1,
                  })
                  setPendingFile({ source: matter.fileSource, id: matter.fileId })
                }}
              />
              {client ? (
                <div key={client.id} className="space-y-4 file-notes-fade-in">
                  <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFA] px-4 py-3 border border-[#E7E7E7]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white text-xs font-bold shadow-sm">
                      {clientInitials(client.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#111111] truncate">{client.name}</div>
                      <div className="text-xs text-[#5C5C5C] truncate mt-0.5">{client.email}</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs font-semibold shrink-0"
                      onClick={() => handleClientChange(null)}
                    >
                      Change
                    </Button>
                  </div>
                  {loadingFiles ? (
                    <p className="text-xs text-[#5C5C5C] px-1" aria-busy="true">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#111111] animate-pulse mr-2 align-middle" />
                      Loading matters…
                    </p>
                  ) : files.length === 0 ? (
                    <p className="text-xs font-medium text-[#1C1C1C] bg-[#FAFAFA] rounded-xl px-4 py-3 border border-[#E7E7E7] leading-relaxed">
                      No active matters. Create a service agreement or application first.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2" role="listbox" aria-label="Select matter">
                      {files.map((file) => {
                        const active =
                          selectedFile?.id === file.id && selectedFile?.source === file.source
                        return (
                          <button
                            key={`${file.source}-${file.id}`}
                            type="button"
                            role="option"
                            aria-selected={active ? "true" : "false"}
                            onClick={() => setSelectedFile(file)}
                            className={cn(
                              "rounded-xl px-4 py-2.5 text-left text-xs font-semibold border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#111111]/20",
                              active
                                ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                                : "bg-white text-[#5C5C5C] border-[#E7E7E7] hover:border-[#111111]/20 hover:bg-[#FAFAFA]",
                            )}
                          >
                            {file.display_label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#5C5C5C] leading-relaxed px-1">
                  Start typing to find a client or matter in your practice.
                </p>
              )}
            </div>
          </FileNotesPanel>
        </aside>

        <section className="lg:col-span-3">
          <FileNotesPanel
            title={client && selectedFile ? "Matter Summary" : "Case Management"}
            subtitle={client && selectedFile ? "Compliance context for this file" : "How file notes work"}
            stagger={80}
            aria-label="Matter summary"
          >
            {client && selectedFile ? (
              <div key={matterKey} className="space-y-5 file-notes-fade-in">
                <div>
                  <p className="text-2xl font-semibold text-[#111111] tracking-tight font-sans-ui">
                    {selectedFile.file_number}
                  </p>
                  {selectedFile.short_label && (
                    <p className="text-sm text-[#5C5C5C] mt-2">{selectedFile.short_label}</p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] px-4 py-3">
                    <dt className="text-[#5C5C5C] font-semibold uppercase tracking-wide text-[10px]">Client</dt>
                    <dd className="mt-1.5 font-semibold text-[#111111] truncate">{client.name}</dd>
                  </div>
                  <div className="rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] px-4 py-3">
                    <dt className="text-[#5C5C5C] font-semibold uppercase tracking-wide text-[10px]">Notes</dt>
                    <dd className="mt-1.5 font-semibold text-[#111111] tabular-nums">{total}</dd>
                  </div>
                </dl>
                <p className="text-xs text-[#5C5C5C] leading-relaxed">
                  System events are recorded automatically. Manual notes are append-only and
                  timestamped for audit readiness.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting || total === 0}
                  onClick={handleExport}
                  className="rounded-xl font-semibold gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Exporting…" : "Export for Audit"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <GuidanceItem
                  icon={Search}
                  title="Search a client or matter"
                  description="Use the panel on the left to find a client, then select the matter you are working on."
                />
                <GuidanceItem
                  icon={StickyNote}
                  title="Record compliance notes"
                  description="Phone calls, meetings, and file reviews are captured in an immutable timeline."
                />
                <GuidanceItem
                  icon={FileText}
                  title="Export for audits"
                  description="Download a plain-text export of all notes for a matter at any time."
                />
              </div>
            )}
          </FileNotesPanel>
        </section>

        {canAdd && (
          <section className="lg:col-span-5">
            <FileNotesPanel
              title="Quick Note"
              subtitle="Append-only · Ctrl+Enter to submit"
              stagger={160}
              aria-label="Quick note entry"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-[240px]">
                {!client || !selectedFile ? (
                  <InlineEmptyState
                    icon={StickyNote}
                    title="Select a matter"
                    description="Choose a client and matter to start recording notes."
                  />
                ) : (
                  <div key={matterKey} className="space-y-4 file-notes-fade-in flex-1 flex flex-col">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Note type">
                      {manualTypes.map((opt) => {
                        const selected = noteType === opt.code
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => setNoteType(opt.code)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 border focus-visible:ring-2 focus-visible:ring-[#111111]/20",
                              selected
                                ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                                : "bg-white text-[#5C5C5C] border-[#E7E7E7] hover:border-[#111111]/20 hover:bg-[#FAFAFA]",
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: opt.dot_color }}
                            />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    <textarea
                      className="w-full flex-1 min-h-[140px] rounded-xl border border-[#E7E7E7] bg-white px-4 py-3.5 text-sm font-medium text-[#111111] outline-none transition-all duration-200 placeholder:text-[#5C5C5C] focus:border-[#111111]/25 focus:ring-2 focus:ring-[#111111]/10 focus:shadow-sm"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={handleNoteKeyDown}
                      placeholder="Enter note… (Ctrl+Enter or ⌘+Enter to submit)"
                      disabled={saving}
                      maxLength={8000}
                      aria-label="Note body"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#5C5C5C] font-medium">
                        <Keyboard className="h-3.5 w-3.5" aria-hidden />
                        {body.length} chars
                      </span>
                      <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="rounded-xl font-semibold gap-2 shadow-sm transition-transform duration-200 active:scale-[0.98]"
                      >
                        <ArrowDown className="h-4 w-4" />
                        {saving ? "Saving…" : "Add Note"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </FileNotesPanel>
          </section>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600"
        >
          {error}
        </div>
      )}

      {/* Full-width note timeline */}
      <section className="space-y-4 animate-enter" style={{ animationDelay: "240ms" }} aria-label="Note timeline">
        <div className="flex flex-wrap items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
              Timeline
            </p>
            <h2 className="section-title text-2xl mt-1">
              {client && selectedFile
                ? `${selectedFile.file_number} — ${total} ${total === 1 ? "Note" : "Notes"}`
                : "Note Timeline"}
            </h2>
          </div>
          {client && selectedFile && (
            <div className="flex flex-wrap gap-2 pb-0.5" role="group" aria-label="Filter notes">
              {filterOptions.map((opt) => {
                const Icon = opt.type ? resolveNoteTypeIcon(opt.type.icon_name) : null
                const selected = filter === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#111111]/20",
                      selected
                        ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                        : "bg-white text-[#5C5C5C] border-[#E7E7E7] hover:border-[#111111]/20 hover:bg-[#FAFAFA]",
                    )}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="immimate-panel">
          <div className="immimate-panel-body">
            {!client || !selectedFile ? (
              <InlineEmptyState
                icon={Clock}
                title="No matter selected"
                description="Search for a client and select a matter to view the compliance note timeline."
              />
            ) : loadingNotes ? (
              <TimelineSkeleton items={4} />
            ) : notes.length === 0 ? (
              <InlineEmptyState
                icon={Clock}
                title="No file notes yet"
                description="Add a note above. Workflow events are recorded automatically."
              />
            ) : (
              <ul key={matterKey} className="space-y-3 file-notes-fade-in">
            {notes.map((note) => {
              const catalogType = noteTypes.find((t) =>
                note.is_system_note ? t.code === "system" : t.code === note.note_type,
              )
              const Icon = resolveNoteTypeIcon(catalogType?.icon_name || "Clock")
              const typeLabel = formatNoteTypeLabel(
                note.note_type,
                note.is_system_note,
                noteTypes,
              )
              const isHighlight =
                note.id === highlightId || isRecentNote(note.recorded_at)
              return (
                <li
                  key={note.id}
                  className={cn(
                    "rounded-xl border px-5 py-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm",
                    note.is_system_note
                      ? "border-[#E7E7E7] bg-[#FAFAFA]"
                      : "border-[#E7E7E7] bg-white hover:border-[#111111]/15",
                    isHighlight && !note.is_system_note && "border-l-[3px] border-l-[#111111] pl-[calc(1.25rem-3px)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: catalogType?.badge_text_color || "#5C5C5C",
                          backgroundColor: catalogType?.badge_bg_color || "#FAFAFA",
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {typeLabel}
                      </span>
                      <span className="text-sm font-semibold text-[#111111]">
                        {note.is_system_note
                          ? APP_NAME
                          : note.author_name || "Agent"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5C5C] font-medium mb-3">
                    <Clock className="h-3 w-3" aria-hidden />
                    <time dateTime={note.recorded_at}>
                      {formatTimelineTimestamp(note.recorded_at)}
                    </time>
                  </div>
                  <p className="text-sm font-medium text-[#111111] whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </p>
                  {note.is_system_note && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C] mt-3">
                      Recorded automatically
                    </p>
                  )}
                </li>
              )
            })}
            {hasMore && (
              <li className="text-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  className="rounded-xl font-semibold"
                  onClick={() => loadNotes({ append: true, nextPage: page + 1 })}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? "Loading more…" : "Load more notes"}
                </Button>
              </li>
            )}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

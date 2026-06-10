"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MatterSearchResult } from "@/features/file-notes/services/client-search.service"

export type ClientSearchResult = {
  id: string
  name: string
  email: string
  phone?: string | null
  client_number?: string | null
  active_file_count: number
}

function clientInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function searchDebounceMs(query: string): number {
  return query.trim().length <= 1 ? 120 : 280
}

function HighlightMatch({
  text,
  query,
  inverted = false,
}: {
  text: string
  query: string
  inverted?: boolean
}) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark
        className={cn(
          "rounded-sm px-0.5 font-semibold not-italic",
          inverted
            ? "bg-white/20 text-white"
            : "bg-[#111111]/10 text-[#111111]",
        )}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export function ClientSearchInput({
  onSelect,
  onMatterSelect,
  selected,
  navigateOnSelect = true,
  minChars = 1,
  placeholder = "Search client, file number, visa…",
}: {
  onSelect?: (client: ClientSearchResult | null) => void
  onMatterSelect?: (matter: MatterSearchResult) => void
  selected?: ClientSearchResult | null
  navigateOnSelect?: boolean
  minChars?: number
  placeholder?: string
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [matters, setMatters] = React.useState<MatterSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [hasSearched, setHasSearched] = React.useState(false)
  const abortRef = React.useRef<AbortController | null>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const pickingRef = React.useRef(false)

  React.useEffect(() => {
    if (selected) {
      setQuery(selected.name)
      setOpen(false)
      setActiveIndex(-1)
    }
  }, [selected])

  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < minChars) {
      setMatters([])
      setLoading(false)
      setHasSearched(false)
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setOpen(true)
      try {
        const res = await fetch(
          `/api/clients/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { signal: controller.signal },
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.success) {
          const results: MatterSearchResult[] = json.matters || []
          setMatters(results)
          setHasSearched(true)
          setOpen(true)
          setActiveIndex(results.length ? 0 : -1)
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, searchDebounceMs(trimmed))

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query, minChars])

  React.useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const pickMatter = (matter: MatterSearchResult) => {
    pickingRef.current = true
    const clientResult: ClientSearchResult = {
      id: matter.clientId,
      name: matter.clientName,
      email: matter.clientEmail,
      active_file_count: 1,
    }

    setQuery(matter.clientName)
    setOpen(false)
    setActiveIndex(-1)

    onMatterSelect?.(matter)
    onSelect?.(clientResult)

    if (!onMatterSelect && navigateOnSelect) {
      router.push(matter.deepLink)
    }

    window.setTimeout(() => {
      pickingRef.current = false
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== "Escape") return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!matters.length) return
      setActiveIndex((i) => (i < matters.length - 1 ? i + 1 : 0))
      setOpen(true)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!matters.length) return
      setActiveIndex((i) => (i > 0 ? i - 1 : matters.length - 1))
      setOpen(true)
    } else if (e.key === "Enter" && activeIndex >= 0 && matters[activeIndex]) {
      e.preventDefault()
      pickMatter(matters[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown =
    open && query.trim().length >= minChars && (loading || hasSearched)

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
            loading ? "text-[#111111]" : "text-[#5C5C5C]",
          )}
          aria-hidden
        />
        <Input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-label="Search clients and matters"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="client-search-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `client-search-option-${activeIndex}` : undefined
          }
          onChange={(e) => {
            if (pickingRef.current) return
            setQuery(e.target.value)
            if (selected && e.target.value !== selected.name) {
              onSelect?.(null)
            }
          }}
          onFocus={() => {
            if (query.trim().length >= minChars) setOpen(true)
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null
            if (next && rootRef.current?.contains(next)) return
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                setOpen(false)
              }
            }, 120)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-11 rounded-xl border-[#E7E7E7] pl-10 pr-9 bg-white immimate-transition text-sm",
            showDropdown && "border-[#111111]/20 ring-2 ring-[#111111]/10 shadow-sm",
          )}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C5C] animate-spin"
            aria-hidden
          />
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute z-30 mt-2 w-full min-w-[280px] max-h-[min(24rem,70vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-[#E7E7E7] bg-white shadow-[0_8px_28px_rgba(17,17,17,0.12)] immimate-scroll py-1 animate-in fade-in-0 zoom-in-[0.98] duration-200"
        >
          {loading && matters.length === 0 && (
            <div className="px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full immimate-skeleton shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 immimate-skeleton rounded" />
                      <div className="h-2.5 w-48 immimate-skeleton rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasSearched && matters.length === 0 && (
            <p className="px-4 py-6 text-center text-sm font-medium text-[#5C5C5C]">
              No clients or matters match &ldquo;{query.trim()}&rdquo;
            </p>
          )}

          {matters.length > 0 && (
            <ul ref={listRef} id="client-search-listbox" role="listbox">
              {matters.map((matter, index) => (
                <li key={`${matter.clientId}-${matter.fileId}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    id={`client-search-option-${index}`}
                    data-index={index}
                    aria-selected={activeIndex === index ? "true" : "false"}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickMatter(matter)
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 border-b border-[#E7E7E7]/50 last:border-0",
                  activeIndex === index
                    ? "bg-[#111111] text-white"
                    : "hover:bg-[#FAFAFA] text-[#111111]",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5",
                    activeIndex === index
                      ? "bg-white/15 text-white"
                      : "bg-[#111111] text-white",
                  )}
                >
                  {clientInitials(matter.clientName)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div
                    className={cn(
                      "text-sm font-semibold leading-snug break-words",
                      activeIndex === index ? "text-white" : "text-[#111111]",
                    )}
                  >
                    <HighlightMatch
                      text={matter.clientName}
                      query={query}
                      inverted={activeIndex === index}
                    />
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium leading-relaxed break-words",
                      activeIndex === index ? "text-white/80" : "text-[#5C5C5C]",
                    )}
                  >
                    {matter.fileNumber}
                    {matter.visaSubclass ? ` · ${matter.visaSubclass}` : ""}
                    {matter.matterType ? ` · ${matter.matterType}` : ""}
                  </div>
                  <div
                    className={cn(
                      "text-xs leading-relaxed break-words",
                      activeIndex === index ? "text-white/65" : "text-[#5C5C5C]",
                    )}
                  >
                    {[matter.stage, matter.assignedAgent].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums shrink-0 rounded-md px-2 py-1 border mt-0.5",
                    activeIndex === index
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-[#FAFAFA] border-[#E7E7E7] text-[#111111]",
                  )}
                >
                  {matter.compliance.completed}/{matter.compliance.total}
                </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

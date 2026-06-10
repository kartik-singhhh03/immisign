"use client"

import { useCallback, useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import type { NotificationRecord } from "@/lib/notifications/types"
import { useNotifications } from "../hooks/useNotifications"
import { normalizeNotification } from "../utils/normalize-notification"
import { useNotificationRealtime } from "../hooks/useNotificationRealtime"
import {
  INBOX_SECTIONS,
  PRIORITY_STYLES,
  SCOPE_FILTERS,
  SIDEBAR_FILTERS,
} from "../utils/notification-ui"
import { NotificationCard } from "./NotificationCard"
import { NotificationDetailPanel } from "./NotificationDetailPanel"

export function NotificationCenterPage() {
  const { user, activeWorkspace } = useAuthStore()
  const [sidebar, setSidebar] = useState("all")
  const [scope, setScope] = useState("all")
  const [priority, setPriority] = useState("all")
  const [inboxView, setInboxView] = useState(false)
  const [inboxSection, setInboxSection] = useState("overdue")
  const [activeId, setActiveId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      sidebar: inboxView ? undefined : sidebar,
      scope,
      priority,
      inbox: inboxView ? inboxSection : undefined,
    }),
    [inboxView, sidebar, scope, priority, inboxSection],
  )

  const {
    items,
    loading,
    count,
    selected,
    toggleSelect,
    clearSelection,
    bulkAction,
    markRead,
    error,
    refresh,
    setItems,
  } = useNotifications(filters)

  const onRealtimeInsert = useCallback(
    (row: NotificationRecord) => {
      const normalized = normalizeNotification(row as unknown as Record<string, unknown>)
      setItems((prev) => {
        if (prev.some((n) => n.id === normalized.id)) return prev
        return [normalized, ...prev]
      })
    },
    [setItems],
  )

  useNotificationRealtime(activeWorkspace?.id, user?.id, onRealtimeInsert)

  const activeNotification = items.find((n) => n.id === activeId) || null

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-6 md:px-8">
      <PageHeader
        eyebrow="Work inbox"
        title="Notification Center"
        description="Actionable workflow notifications — agreements, approvals, SOS, file notes, and system events."
        action={
          <div className="flex gap-2">
            <Button
              variant={inboxView ? "default" : "outline"}
              size="sm"
              className={
                inboxView
                  ? "bg-[#111111] text-white hover:bg-[#1C1C1C]"
                  : "border-[#E7E7E7]"
              }
              onClick={() => setInboxView(!inboxView)}
            >
              {inboxView ? "Inbox view" : "Feed view"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_360px]">
        {/* Left sidebar */}
        <aside className="space-y-6">
          {!inboxView ? (
            <nav className="space-y-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
                Filter
              </p>
              {SIDEBAR_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSidebar(f.id)
                    setActiveId(null)
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    sidebar === f.id
                      ? "bg-[#111111] text-white"
                      : "text-[#5C5C5C] hover:bg-[#F8F8F8] hover:text-[#111111]",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </nav>
          ) : (
            <nav className="space-y-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
                Inbox
              </p>
              {INBOX_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setInboxSection(s.id)
                    setActiveId(null)
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    inboxSection === s.id
                      ? "bg-[#111111] text-white"
                      : "text-[#5C5C5C] hover:bg-[#F8F8F8]",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
              Scope
            </p>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-[#E7E7E7] bg-white px-3 py-2 text-sm text-[#111111]"
            >
              {SCOPE_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
              Priority
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "critical", "high", "normal", "low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                    priority === p
                      ? "bg-[#111111] text-white"
                      : "bg-[#F8F8F8] text-[#5C5C5C]",
                  )}
                >
                  {p === "all" ? "All" : PRIORITY_STYLES[p].label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center feed */}
        <section className="min-w-0">
          {selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] px-4 py-3">
              <span className="text-xs font-semibold text-[#5C5C5C]">
                {selected.size} selected
              </span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("read")}>
                Mark read
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("unread")}>
                Mark unread
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("archive")}>
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => bulkAction("delete")}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          <p className="mb-3 text-xs font-semibold text-[#9CA3AF]">
            {loading && !items.length ? "Loading…" : `${count} notification${count === 1 ? "" : "s"}`}
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && !items.length ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-[#F8F8F8]"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E7E7E7] py-16 text-center">
              <p className="font-serif text-lg text-[#111111]">Inbox zero</p>
              <p className="mt-1 text-sm text-[#5C5C5C]">No notifications match this filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  selected={selected.has(n.id)}
                  active={activeId === n.id}
                  onSelect={() => setActiveId(n.id)}
                  onToggleCheck={() => toggleSelect(n.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right detail panel */}
        <div className="hidden lg:block lg:min-h-[520px]">
          <NotificationDetailPanel
            notification={activeNotification}
            onMarkRead={markRead}
          />
        </div>
      </div>
    </div>
  )
}

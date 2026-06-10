"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { NotificationRecord } from "@/lib/notifications/types"
import { normalizeNotification } from "../utils/normalize-notification"

export type NotificationFilters = {
  sidebar?: string
  scope?: string
  priority?: string
  inbox?: string
}

export function useNotifications(filters: NotificationFilters) {
  const { sidebar, scope, priority, inbox } = filters
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const hasLoaded = useRef(false)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ limit: "50", page: "1" })
    if (sidebar && sidebar !== "all") p.set("sidebar", sidebar)
    if (scope && scope !== "all") p.set("scope", scope)
    if (priority && priority !== "all") p.set("priority", priority)
    if (inbox) p.set("inbox", inbox)
    return p
  }, [sidebar, scope, priority, inbox])

  const refresh = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/notifications?${buildParams()}`)
      const json = await res.json()
      if (json.success) {
        const rows = (json.data || []).map(normalizeNotification)
        setItems(rows)
        setCount(json.count ?? rows.length)
        hasLoaded.current = true
      } else {
        setError(json.error || "Failed to load notifications")
      }
    } catch {
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const bulkAction = async (action: "read" | "unread" | "archive" | "delete") => {
    if (!selected.size) return
    await fetch("/api/notifications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action }),
    })
    clearSelection()
    refresh()
  }

  const markRead = async (id: string, isRead = true) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: isRead }),
    })
    refresh()
  }

  return {
    items,
    loading,
    error,
    count,
    selected,
    toggleSelect,
    clearSelection,
    bulkAction,
    markRead,
    refresh,
    setItems,
  }
}

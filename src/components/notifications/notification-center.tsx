"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import type { NotificationRecord } from "@/lib/notifications/types"
import { useNotificationRealtime } from "@/features/notifications/hooks/useNotificationRealtime"
import { normalizeNotification } from "@/features/notifications/utils/normalize-notification"
import {
  getPriorityStyle,
  relativeTime,
} from "@/features/notifications/utils/notification-ui"

export function NotificationCenter() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, activeWorkspace } = useAuthStore()
  const workspaceSlug = pathname?.match(/^\/workspace\/([^/]+)/)?.[1]
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread")
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setUnread(json.count)
    } catch {
      /* ignore */
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "8", page: "1" })
      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setItems((json.data || []).map(normalizeNotification))
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const onRealtimeInsert = useCallback(
    (row: NotificationRecord) => {
      const normalized = normalizeNotification(row as unknown as Record<string, unknown>)
      setItems((prev) => {
        if (prev.some((n) => n.id === normalized.id)) return prev
        return [normalized, ...prev].slice(0, 8)
      })
      if (!normalized.is_read) setUnread((c) => c + 1)
    },
    [],
  )

  useNotificationRealtime(activeWorkspace?.id, user?.id, onRealtimeInsert)

  useEffect(() => {
    loadUnread()
  }, [loadUnread])

  useEffect(() => {
    if (open) loadList()
  }, [open, loadList])

  const markRead = async (id: string, url?: string | null) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    })
    loadUnread()
    loadList()
    setOpen(false)
    if (url) router.push(url)
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" })
    loadUnread()
    loadList()
  }

  const viewAllHref = workspaceSlug
    ? `/workspace/${workspaceSlug}/notifications`
    : "/notifications"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-[#5C5C5C] hover:bg-[#FAFAFA]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl border-[#E7E7E7] bg-white p-0 shadow-xl"
        align="end"
      >
        <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#111111]">Recent Notifications</p>
            <p className="text-xs text-[#5C5C5C]">{unread} unread</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold text-[#5C5C5C]"
            onClick={markAllRead}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#5C5C5C]">No notifications</p>
          ) : (
            items.map((n) => {
              const dot = getPriorityStyle(n.priority).dot
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id, n.action_url)}
                  className={cn(
                    "w-full border-b border-[#F8F8F8] px-4 py-3 text-left transition-colors hover:bg-[#FAFAFA]",
                    !n.is_read && "bg-white",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#111111]">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#5C5C5C]">{n.message}</p>
                      <p className="mt-1 text-[10px] font-semibold text-[#9CA3AF]">
                        {relativeTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
        <div className="border-t border-[#E7E7E7] p-2">
          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="block rounded-lg py-2.5 text-center text-xs font-bold text-[#111111] transition-colors hover:bg-[#FAFAFA]"
          >
            View All → Notification Center
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

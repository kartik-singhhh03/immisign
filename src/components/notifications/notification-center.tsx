"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "approval", label: "Approvals" },
  { id: "agreement", label: "Agreements" },
  { id: "document", label: "Documents" },
  { id: "team", label: "Team" },
  { id: "reminder", label: "Reminders" },
  { id: "system", label: "System" },
]

export function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(false)

  const loadUnread = useCallback(async () => {
    const res = await fetch("/api/notifications/unread")
    const json = await res.json()
    if (json.success) setUnread(json.count)
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "15", page: "1" })
    if (filter !== "all") params.set("type", filter)
    const res = await fetch(`/api/notifications?${params}`)
    const json = await res.json()
    if (json.success) setItems(json.data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadUnread()
    const t = setInterval(loadUnread, 30000)
    return () => clearInterval(t)
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100"
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
        className="w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border-slate-200 bg-white p-0 shadow-xl"
        align="end"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">{unread} unread</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold h-8" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
          </Button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-slate-50">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                filter === f.id ? "bg-[#0D9F8C] text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No notifications</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n.id, n.action_url)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors",
                  !n.is_read && "bg-[#0D9F8C]/5",
                )}
              >
                <p className="text-xs font-bold text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleString()} · {n.type}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t border-slate-100">
          <Link
            href="/workspace"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-bold text-[#0D9F8C] py-2 hover:underline"
          >
            Open dashboard
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

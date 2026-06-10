"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NotificationRecord } from "@/lib/notifications/types"
import {
  formatDueLabel,
  getNotificationActions,
  getPriorityStyle,
  relativeTime,
} from "../utils/notification-ui"

type ActivityRow = {
  id: string
  title: string
  description: string | null
  created_at: string
  event_type: string
}

type Props = {
  notification: NotificationRecord | null
  onMarkRead: (id: string) => void
}

export function NotificationDetailPanel({ notification, onMarkRead }: Props) {
  const [activity, setActivity] = useState<ActivityRow[]>([])

  useEffect(() => {
    if (!notification) {
      setActivity([])
      return
    }
    fetch(`/api/notifications/${notification.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setActivity(j.activity || [])
      })
  }, [notification?.id])

  if (!notification) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7E7E7] bg-[#FAFAFA] p-8 text-center">
        <p className="font-serif text-lg text-[#111111]">Select a notification</p>
        <p className="mt-1 text-sm text-[#5C5C5C]">
          Review details, actions, and activity timeline.
        </p>
      </div>
    )
  }

  const styles = getPriorityStyle(notification.priority)
  const actions = getNotificationActions(notification)
  const dueLabel = formatDueLabel(notification.due_at)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#E7E7E7] bg-white shadow-[0_2px_16px_rgba(17,17,17,0.04)]">
      <div className="border-b border-[#E7E7E7] px-6 py-5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5C5C5C]">
            {styles.label} · {notification.workflow_category || notification.type}
          </span>
        </div>
        <h2 className="mt-2 font-serif text-2xl font-normal text-[#111111]">
          {notification.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">
          {notification.message}
        </p>
        <p className="mt-3 text-xs font-semibold text-[#9CA3AF]">
          {new Date(notification.created_at).toLocaleString()} · {relativeTime(notification.created_at)}
        </p>
        {dueLabel && (
          <p className="mt-1 text-xs font-bold text-[#111111]">{dueLabel}</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[#E7E7E7] px-6 py-4">
          {actions.map((action) =>
            action.href ? (
              <Button
                key={action.id}
                asChild
                size="sm"
                variant={action.variant === "primary" ? "default" : "outline"}
                className={
                  action.variant === "primary"
                    ? "bg-[#111111] text-white hover:bg-[#1C1C1C]"
                    : "border-[#E7E7E7] text-[#111111]"
                }
                onClick={() => !notification.is_read && onMarkRead(notification.id)}
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button key={action.id} size="sm" variant="outline">
                {action.label}
              </Button>
            ),
          )}
          {!notification.is_read && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[#5C5C5C]"
              onClick={() => onMarkRead(notification.id)}
            >
              Mark read
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
          Activity timeline
        </p>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-[#9CA3AF]">No linked activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {activity.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-[#E7E7E7] bg-[#FAFAFA] px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-[#111111]">{ev.title}</p>
                {ev.description && (
                  <p className="mt-0.5 text-xs text-[#5C5C5C]">{ev.description}</p>
                )}
                <p className="mt-1 text-[10px] text-[#9CA3AF]">
                  {relativeTime(ev.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { NotificationRecord } from "@/lib/notifications/types"

type Listener = (row: NotificationRecord) => void

type ChannelEntry = {
  channel: RealtimeChannel
  listeners: Set<Listener>
}

const channelRegistry = new Map<string, ChannelEntry>()

function channelKey(userId: string, agencyId: string) {
  return `notifications:${agencyId}:${userId}`
}

function subscribeToNotifications(userId: string, agencyId: string, listener: Listener) {
  const key = channelKey(userId, agencyId)
  let entry = channelRegistry.get(key)

  if (!entry) {
    const supabase = createClient()
    const listeners = new Set<Listener>()

    const channel = supabase
      .channel(key)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRecord
          if (row.agency_id !== agencyId) return
          if ('deleted_at' in row && row.deleted_at) return
          listeners.forEach((fn) => fn(row))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRecord
          if (row.agency_id !== agencyId) return
          if ('deleted_at' in row && row.deleted_at) return
          listeners.forEach((fn) => fn(row))
        },
      )
      .subscribe()

    entry = { channel, listeners }
    channelRegistry.set(key, entry)
  }

  entry.listeners.add(listener)

  return () => {
    const current = channelRegistry.get(key)
    if (!current) return
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      const supabase = createClient()
      supabase.removeChannel(current.channel)
      channelRegistry.delete(key)
    }
  }
}

export function useNotificationRealtime(
  agencyId: string | undefined,
  userId: string | undefined,
  onInsert: (row: NotificationRecord) => void,
) {
  const onInsertRef = useRef(onInsert)
  onInsertRef.current = onInsert

  useEffect(() => {
    if (!agencyId || !userId) return

    const listener: Listener = (row) => onInsertRef.current(row)
    return subscribeToNotifications(userId, agencyId, listener)
  }, [agencyId, userId])
}

export function useUnreadCountRealtime(
  onChange: (count: number) => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const refresh = async () => {
    try {
      const res = await fetch("/api/notifications/unread")
      const json = await res.json()
      if (json.success) onChangeRef.current(json.count)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return refresh
}

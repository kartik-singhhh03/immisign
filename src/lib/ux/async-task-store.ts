"use client"

import { create } from "zustand"

export type AsyncTask = {
  id: string
  label: string
  startedAt: number
  overlay?: boolean
}

type AsyncTaskState = {
  tasks: AsyncTask[]
  start: (id: string, label: string, options?: { overlay?: boolean }) => void
  end: (id: string) => void
  isBusy: () => boolean
}

export const useAsyncTaskStore = create<AsyncTaskState>((set, get) => ({
  tasks: [],
  start: (id, label, options) => {
    set((s) => ({
      tasks: [...s.tasks.filter((t) => t.id !== id), { id, label, startedAt: Date.now(), overlay: options?.overlay }],
    }))
  },
  end: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
  isBusy: () => get().tasks.length > 0,
}))

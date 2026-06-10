"use client"

import { FileNotesWorkspace } from "./FileNotesWorkspace"

export function FileNotesPage() {
  return (
    <div className="w-full max-w-[1400px] mx-auto animate-enter px-4 md:px-6 pb-8">
      <FileNotesWorkspace showPageHeader canAdd />
    </div>
  )
}

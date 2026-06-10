"use client"

import * as React from 'react'

type CommandPaletteContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openPalette: () => setOpen(true),
      closePalette: () => setOpen(false),
      togglePalette: () => setOpen((v) => !v),
    }),
    [open],
  )

  return (
    <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return ctx
}

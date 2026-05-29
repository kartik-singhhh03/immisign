"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import {
  FileSignature,
  FileText,
  Search,
  Users,
  Settings,
  CreditCard,
  LayoutDashboard,
  Send
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { activeWorkspace } = useAuthStore()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const slug = activeWorkspace?.slug || "avc-migration"
  const prefix = `/workspace/${slug}`

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/agreements/new`))}>
            <Send className="mr-2 h-4 w-4" />
            <span>Send New Agreement</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/documents/upload`))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Upload Document</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/dashboard`))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/agreements`))}>
            <FileSignature className="mr-2 h-4 w-4" />
            <span>Agreements</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/clients`))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/templates`))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Templates</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/settings/agency`))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Agency Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/billing`))}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

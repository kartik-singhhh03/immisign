"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import {
  FileSignature,
  FileText,
  Users,
  Settings,
  LayoutDashboard,
  Send,
  FileCheck2,
  Search,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type SearchResult = {
  type: string
  id: string
  label: string
  sublabel?: string
  href: string
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const router = useRouter()
  const { slug } = useRequireWorkspace()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((current) => !current)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setResults(j.results || [])
        })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    setQuery("")
    command()
  }, [])

  if (!slug) return null

  const prefix = `/workspace/${slug}`

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search clients, agreements, approvals…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Search results">
            {results.map((r) => (
              <CommandItem
                key={`${r.type}-${r.id}`}
                onSelect={() => runCommand(() => router.push(r.href))}
              >
                <Search className="mr-2 h-4 w-4 opacity-50" />
                <span>{r.label}</span>
                {r.sublabel && (
                  <span className="ml-2 text-xs text-muted-foreground">{r.sublabel}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.length > 0 && <CommandSeparator />}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/agreements/new`))}>
            <Send className="mr-2 h-4 w-4" />
            <span>Send New Agreement</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/approvals/new`))}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            <span>New Application Approval</span>
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
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/approvals`))}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            <span>Application Approvals</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/clients`))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/activity`))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Activity Feed</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push(`${prefix}/settings?section=Notifications`))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Notification preferences</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

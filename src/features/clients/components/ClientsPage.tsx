"use client"

import * as React from "react"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useClients } from "@/lib/hooks/useSupabaseData"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileArchive,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UploadCloud,
  ShieldCheck,
  Trash2,
  X,
  Palette,
  Users,
  ShieldAlert,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { StatusPill } from "@/components/saas/dashboard-pages"

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="animate-enter mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]">{eyebrow}</div>}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081B2E] md:text-4xl">{title}</h1>
        <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-slate-500 font-medium">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function ClientsPage() {
  const { data: clientsList, loading, addClient } = useClients()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  
  // New Client Form States
  const [clientName, setClientName] = React.useState("")
  const [clientEmail, setClientEmail] = React.useState("")
  const [clientPhone, setClientPhone] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName || !clientEmail) return

    try {
      setIsSubmitting(true)
      await addClient({
        name: clientName,
        email: clientEmail,
        phone: clientPhone || null,
      })
      
      setIsOpen(false)
      setClientName("")
      setClientEmail("")
      setClientPhone("")
    } catch (err: any) {
      alert("Error creating client: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredClients = clientsList?.filter(
    (c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)
  const { slug: currentSlug } = useRequireWorkspace()

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="Client relationship workspace"
        description="Premium CRM-style profiles connected to agreements, documents, notes and matter timelines."
        action={
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"
          >
            <Plus className="h-4 w-4 mr-1.5" />New client
          </Button>
        }
      />

      {/* SEARCH TOOLBAR */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name or email address..."
            className="h-12 rounded-2xl border-slate-200/50 bg-white/70 pl-11 shadow-[0_8px_20px_rgba(8,27,46,0.02)] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl border-slate-200/60 bg-white/70 px-5 font-bold hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* CLIENTS GRID */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 font-medium">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="p-8 text-center text-slate-500 font-medium">No clients found.</div>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client: any) => (
            <Link
              key={client.id}
              href={`/workspace/${currentSlug}/clients/${client.id}`}
              className="grid gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all hover:bg-white/90 md:grid-cols-[1fr_0.8fr_0.6fr_0.6fr_auto] md:items-center"
            >
              <div>
                <div className="font-bold text-[#081B2E]">{client.name}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {client.email}{client.phone ? ` · ${client.phone}` : ""}
                </div>
              </div>
              <div><StatusPill status={client.stage} /></div>
              <div className="text-sm font-semibold text-slate-650">
                {client.matters} {client.matters === 1 ? "matter" : "matters"}
              </div>
              <div className="text-sm font-bold text-[#081B2E]">{client.value}</div>
              <ArrowRight className="h-4 w-4 text-slate-350 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* ADD CLIENT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Register New Visa Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Client Full Name
              <Input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. Manpreet Sodhi"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Email Address
              <Input
                required
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. manpreet@gmail.com"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Phone Number
              <Input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. +61 400 000 000"
              />
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <Button disabled={isSubmitting} type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button disabled={isSubmitting} type="submit" className="rounded-xl h-11 text-xs font-bold bg-[#0D9F8C] hover:bg-[#0A5B52]">
                {isSubmitting ? "Saving..." : "Save Client Profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

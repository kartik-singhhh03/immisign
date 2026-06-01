"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { getRealAgencyId, useClients } from "@/lib/hooks/useSupabaseData"
import { createClient } from "@/lib/supabase/client"
import { ClientsRepository } from "@/lib/supabase/repositories"
import Link from "next/link"
import {
  CheckCircle2,
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  User,
  Calendar,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  const clientId = path[1]

  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const currentSlug = activeWorkspace?.slug || "avc-migration"

  const { updateClient, deleteClient } = useClients()

  // Fetch the single client by UUID directly
  const [client, setClient] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState<string | null>(null)

  // Edit dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [editName, setEditName] = React.useState("")
  const [editEmail, setEditEmail] = React.useState("")
  const [editPhone, setEditPhone] = React.useState("")
  const [editSaving, setEditSaving] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)

  // Delete confirmation states
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const supabase = React.useMemo(() => createClient(), [])
  const repo = React.useMemo(() => new ClientsRepository(supabase), [supabase])

  const loadClient = React.useCallback(async () => {
    if (!clientId || !activeWorkspace?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setFetchError(null)
      const agencyId = await getRealAgencyId(supabase, activeWorkspace.id)
      if (!agencyId) {
        throw new Error("Authenticated agency could not be resolved.")
      }
      const data = await repo.getById(clientId, agencyId)
      setClient(data)
    } catch (e: any) {
      setFetchError(e.message || "Failed to load client")
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace?.id, clientId, repo])

  React.useEffect(() => { loadClient() }, [loadClient])

  const openEdit = () => {
    if (!client) return
    setEditName(client.name || "")
    setEditEmail(client.email || "")
    setEditPhone(client.phone || "")
    setEditError(null)
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName || !editEmail) return
    try {
      setEditSaving(true)
      setEditError(null)
      await updateClient(clientId, { name: editName, email: editEmail, phone: editPhone })
      await loadClient()
      setIsEditOpen(false)
    } catch (err: any) {
      setEditError(err.message || "Update failed")
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deleteClient(clientId)
      router.push(`/workspace/${currentSlug}/clients`)
    } catch (err: any) {
      alert("Error deleting client: " + err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0D9F8C] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading client profile...</p>
        </div>
      </div>
    )
  }

  if (fetchError || !client) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500 font-medium">{fetchError || "Client not found or access denied."}</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link href={`/workspace/${currentSlug}/clients`}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Clients
          </Link>
        </Button>
      </div>
    )
  }

  const joinedDate = client.created_at
    ? new Date(client.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : "Unknown"

  return (
    <div className="animate-enter space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 text-slate-500 font-semibold text-xs px-0 hover:text-[#0D9F8C]">
            <Link href={`/workspace/${currentSlug}/clients`}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Clients
            </Link>
          </Button>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]">Client Profile</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081B2E] md:text-4xl">{client.name}</h1>
          <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-slate-500 font-medium">
            Agreement history, sent documents, notes and matter timeline.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={openEdit}
            variant="outline"
            className="rounded-xl border-slate-200 bg-white font-bold h-10 text-xs hover:border-[#0D9F8C]/40"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
          </Button>
          <Button
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-xl bg-rose-50 text-rose-600 border border-rose-100 font-bold h-10 text-xs hover:bg-rose-100"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Client
          </Button>
        </div>
      </div>

      {/* Profile Grid */}
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        {/* Profile Card */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Profile Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <User className="h-4 w-4 text-[#0D9F8C] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Full Name</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Mail className="h-4 w-4 text-[#0D9F8C] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email Address</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.email}</div>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <Phone className="h-4 w-4 text-[#0D9F8C] shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone</div>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.phone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Calendar className="h-4 w-4 text-[#0D9F8C] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Client Since</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{joinedDate}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 mt-2">
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Client UUID</div>
                <div className="font-mono text-xs text-slate-500 select-all break-all">{client.id}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Matter Timeline</h2>
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50/60 text-[#0D9F8C] border border-emerald-100/50 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#081B2E]">Client Profile Created</div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">{joinedDate}</div>
                </div>
              </div>
              <div className="flex gap-4 opacity-40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500">Agreement Dispatch</div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Edit Client Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-3">
            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
                {editError}
              </div>
            )}
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Full Name
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                disabled={editSaving}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Email Address
              <Input
                required
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                disabled={editSaving}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Phone Number
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="+61 400 000 000"
                disabled={editSaving}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSaving}
                className="rounded-xl h-11 text-xs font-bold bg-[#0D9F8C] hover:bg-[#0A5B52]"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Delete Client?</DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              You are about to permanently delete <strong className="text-slate-800">{client.name}</strong> and all associated records. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-xl h-11 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

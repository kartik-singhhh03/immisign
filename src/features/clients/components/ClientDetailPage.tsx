"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/features/auth/store/authStore"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { getRealAgencyId, useClients } from "@/lib/hooks/useSupabaseData"
import { createClient } from "@/lib/supabase/client"
import { ClientsRepository } from "@/lib/supabase/repositories"
import { Role, canEdit, canDelete } from "@/features/auth/types/roles"
import Link from "next/link"
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  User,
  Calendar,
  FileSignature,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PhoneInput } from "@/components/ui/phone-input"
import { parseOrThrow } from "@/lib/validations/fields"
import { clientUpdateSchema } from "@/lib/validations/schemas"
import { Input } from "@/components/ui/input"
import { CardSkeleton } from "@/components/ui/skeletons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClientDetailWorkspace } from "./ClientDetailWorkspace"
import { ClientMatterDetailsPanel, ClientProfileHeader } from "./ClientMatterDetailsPanel"
import { ClientAuditPanel } from "./ClientAuditPanel"
import { ProfessionalErrorPanel } from "@/components/errors/professional-error"
import type { ClientMatterContext } from "../lib/client-matter-context"
import { useSearchParams } from "next/navigation"

export function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  const clientId = path[1]

  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const user = useAuthStore((s) => s.user)
  const { slug: currentSlug } = useRequireWorkspace()
  const role = (user?.role || 'Read-only staff') as Role
  const isEditor = canEdit(role, 'clients')
  const isDeleter = canDelete(role, 'clients')

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
  const [matterContext, setMatterContext] = React.useState<ClientMatterContext | null>(null)
  const [matterLoading, setMatterLoading] = React.useState(true)

  const fileSource = searchParams.get("file_source")
  const fileId = searchParams.get("file_id")

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

  const loadMatterContext = React.useCallback(async () => {
    if (!clientId) return
    setMatterLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fileSource) qs.set("file_source", fileSource)
      if (fileId) qs.set("file_id", fileId)
      const res = await fetch(`/api/clients/${clientId}/matter-context?${qs}`)
      const json = await res.json()
      if (res.ok && json.context) setMatterContext(json.context)
    } catch {
      setMatterContext(null)
    } finally {
      setMatterLoading(false)
    }
  }, [clientId, fileSource, fileId])

  React.useEffect(() => {
    if (client) loadMatterContext()
  }, [client, loadMatterContext])

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
      const payload = parseOrThrow(clientUpdateSchema, {
        name: editName,
        email: editEmail,
        phone: editPhone || null,
      })
      await updateClient(clientId, payload)
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
      <div className="space-y-6 p-2" aria-busy="true" aria-label="Loading client profile">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton className="min-h-[280px]" />
      </div>
    )
  }

  if (fetchError || !client) {
    return (
      <div className="p-12 flex justify-center">
        <ProfessionalErrorPanel
          kind="client_not_found"
          detail={fetchError || undefined}
          backHref={`/workspace/${currentSlug}/clients`}
          backLabel="Back to clients"
        />
      </div>
    )
  }

  const joinedDate = client.created_at
    ? new Date(client.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <div className="animate-enter space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="mb-3 text-slate-500 font-semibold text-xs px-0 hover:text-[#111111]">
            <Link href={`/workspace/${currentSlug}/clients`}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Clients
            </Link>
          </Button>
          <ClientProfileHeader clientName={client.name} context={matterContext} />
        </div>
        <div className="flex gap-2 shrink-0">
          {isEditor && (
            <Button
              onClick={openEdit}
              variant="outline"
              className="rounded-xl border-slate-200 bg-white font-bold h-10 text-xs hover:border-[#111111]/40"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
            </Button>
          )}
          {isDeleter && (
            <Button
              onClick={() => setIsDeleteOpen(true)}
              className="rounded-xl bg-rose-50 text-rose-600 border border-rose-100 font-bold h-10 text-xs hover:bg-rose-100"
              variant="outline"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Client
            </Button>
          )}
        </div>
      </div>

      {/* Profile Grid */}
      <div className="max-w-xl">
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#111111] mb-5">Profile Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <User className="h-4 w-4 text-[#111111] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Full Name</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Mail className="h-4 w-4 text-[#111111] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email Address</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.email}</div>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <Phone className="h-4 w-4 text-[#111111] shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone</div>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5">{client.phone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Calendar className="h-4 w-4 text-[#111111] shrink-0" />
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Client Since</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">{joinedDate}</div>
                </div>
              </div>
              {client.client_number && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <FileSignature className="h-4 w-4 text-[#111111] shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Client Number</div>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5 font-mono">{client.client_number}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      <ClientMatterDetailsPanel
        clientId={clientId}
        workspaceSlug={currentSlug}
        loading={matterLoading}
        context={matterContext}
      />

      <ClientAuditPanel clientId={clientId} />

      {activeWorkspace?.id && currentSlug && (
        <ClientDetailWorkspace
          clientId={clientId}
          agencyWorkspaceId={activeWorkspace.id}
          workspaceSlug={currentSlug}
          client={client}
          matterContext={matterContext}
          canEditNotes={isEditor}
          canManage={isEditor}
        />
      )}

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">Edit Client Profile</DialogTitle>
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
              <PhoneInput
                value={editPhone}
                onChange={setEditPhone}
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
                className="rounded-xl h-11 text-xs font-bold bg-[#111111] hover:bg-[#222222]"
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
            <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">Delete Client?</DialogTitle>
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


"use client"
import * as React from "react"
import { useAuthStore } from "@/store/authStore"
import { isSettingsRestrictedForUiRole } from "@/lib/auth/db-roles"
import { useTeamMembers, useInvitations, useAgencyProfile, useClauses, useUserProfile, useMatterTypesSettings, usePaymentScheduleSettings, useRmaTeam } from "@/lib/hooks/useSupabaseData"
import { AgencyProfilePanel, DefaultsPanel, FinancialSettingsPanel, RmaTeamPanel, SettingsListEditor } from "./WorkspaceSettingsPanels"
import { ProfessionalSignaturePanel } from "./ProfessionalSignaturePanel"
import { SecurityCenterPanel } from "./SecurityCenterPanel"
import { BrandingSettingsPanel } from "./BrandingSettingsPanel"
import { MatterTypesSettingsPanel } from "./MatterTypesSettingsPanel"
import { NotificationPreferencesPanel } from "./NotificationPreferencesPanel"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { useSearchParams, useParams } from "next/navigation"
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
import { PhoneInput } from "@/components/ui/phone-input"
import { DigitsInput } from "@/components/ui/digits-input"
import { Label } from "@/components/ui/label"
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







function statusClass(status: string) {
  if (status === "Signed" || status === "Active") return "border-[#E7E7E7]/70 bg-[#FAFAFA]/90 text-[#111111] shadow-[0_0_0_1px_rgba(17,17,17,0.04),0_8px_18px_rgba(17,17,17,0.10)]"
  if (status === "Awaiting" || status === "Awaiting signature") return "border-amber-200/70 bg-amber-50/90 text-amber-700 shadow-[0_8px_18px_rgba(245,158,11,0.10)]"
  if (status === "Sent" || status === "Document review") return "border-blue-200/70 bg-blue-50/90 text-blue-700 shadow-[0_8px_18px_rgba(59,130,246,0.10)]"
  if (status === "Expired") return "border-red-200/70 bg-red-50/90 text-red-700 shadow-[0_8px_18px_rgba(239,68,68,0.10)]"
  return "border-slate-200 bg-slate-100/80 text-slate-700"
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string
  value: string
  change: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="group rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(8,27,46,0.02),0_18px_48px_rgba(8,27,46,0.05)] hover:border-slate-350/50">
      <CardContent className="relative p-6">
        <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-[#111111]/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7E7E7]/50 bg-gradient-to-b from-[#FAFAFA] to-[#ffffff] text-[#111111] shadow-[0_4px_12px_rgba(17,17,17,0.12)] group-hover:scale-105 transition-transform duration-300">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-[#E7E7E7]/50 bg-[#FAFAFA]/50 px-2.5 py-0.5 text-xs font-bold text-[#222222]">{change}</span>
        </div>
        <div className="mt-6 text-[12px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="font-sans-ui mt-1.5 text-3xl font-bold tracking-tight text-[#111111]">{value}</div>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-slate-100/80">
          <div className="chart-bar immimate-progress-fill h-full rounded-full" style={{ width: "72%" }} />
        </div>
      </CardContent>
    </Card>
  )
}



export function SettingsPage({ section = "" }: { section?: string }) {
  const { activeWorkspace, user, updateWorkspaceBranding } = useAuthStore()

  // Hooks
  const { data: teamMembers, loading: teamLoading, updateRole, updateStatus, removeMember } = useTeamMembers()
  const { data: invitations, loading: invitesLoading, cancelInvite } = useInvitations()
  const { data: agencyProfile, loading: agencyLoading, updateProfile, updateBranding, updateDefaults } = useAgencyProfile()
  const { data: clausesList, loading: clausesLoading, addClause, deleteClause } = useClauses()
  const { data: matterTypesList, loading: matterTypesLoading, addMatterType, deleteMatterType, loadMatterTypeFields, addMatterTypeField, deleteMatterTypeField } = useMatterTypesSettings()
  const { data: paymentSchedulesList, loading: paymentSchedulesLoading, addSchedule, deleteSchedule } = usePaymentScheduleSettings()
  const { data: rmaTeamList, loading: rmaLoading, refetch: refetchRmaTeam, setDefault: setDefaultRma, setStatus: setRmaStatus, removeRma, upsertRma } = useRmaTeam()
  const { updateProfile: updateUserProfile, loading: userLoading } = useUserProfile()

  const currentRole = user?.role || "Owner"
  const isSettingsRestricted = isSettingsRestrictedForUiRole(currentRole)
  const currentWorkspace = activeWorkspace || { name: "", slug: "", color: "#111111", initials: "IS" }
  const currentSlug = currentWorkspace.slug

  const searchParams = useSearchParams()

  // Map old props to query parameter keys for backward compatibility
  const propToKeyMap: Record<string, string> = {
    "Agency Profile": "Agency",
    "RMA Team": "RmaTeam",
    "Team": "RmaTeam",
    "Branding": "Branding",
    "Clauses": "Clauses",
    "Matter Types": "MatterTypes",
    "Payment Schedules": "PaymentSchedules",
    "Defaults": "Defaults",
    "Matter Defaults": "Defaults",
    "Financial Settings": "Financial",
    "Financial": "Financial",
    "Security": "Security",
    "My Profile": "Profile",
  }

  // Derive the active section key
  const activeSectionKey = searchParams?.get("section") || propToKeyMap[section] || "Agency"

  const sectionTitleMap: Record<string, string> = {
    Agency: "Agency Profile",
    RmaTeam: "RMA Team",
    Branding: "Branding",
    Clauses: "Clauses",
    MatterTypes: "Matter Types",
    PaymentSchedules: "Payment Schedules",
    Defaults: "Defaults & Special Terms",
    Financial: "Financial Settings",
    Profile: "My Profile",
    Security: "Security",
    MFA: "Security",
    Notifications: "Notifications",
  }

  const workspaceItems = [
    ["Agency Profile", "Agency"],
    ["RMA Team", "RmaTeam"],
    ["Branding", "Branding"],
    ["Clauses", "Clauses"],
    ["Matter Types", "MatterTypes"],
    ["Payment Schedules", "PaymentSchedules"],
    ["Defaults", "Defaults"],
    ["Financial Settings", "Financial"],
    ["Notifications", "Notifications"],
  ] as const

  const currentTitle = sectionTitleMap[activeSectionKey] || "Agency Profile"

  const personalItems = [
    ["My Profile", "Profile"],
    ["Security", "Security"],
  ] as const

  type SecurityTab = "profile" | "password" | "mfa" | "sessions" | "logs" | "account"
  const [securityTab, setSecurityTab] = React.useState<SecurityTab>(
    (searchParams?.get("tab") as SecurityTab) || "profile",
  )
  React.useEffect(() => {
    const t = searchParams?.get("tab") as SecurityTab | null
    if (t) setSecurityTab(t)
  }, [searchParams])

  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Team Invite State
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteName, setInviteName] = React.useState("")
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteMarn, setInviteMarn] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("agent")
  const [inviting, setInviting] = React.useState(false)
  const [inviteProgress, setInviteProgress] = React.useState(0)
  const [inviteSeatWarning, setInviteSeatWarning] = React.useState<string | null>(null)

  const loadInviteSeatPreview = React.useCallback(async (role: string) => {
    try {
      const res = await fetch(`/api/stripe/seats?role=${encodeURIComponent(role)}`)
      const json = await res.json()
      if (res.ok && json.warning) {
        setInviteSeatWarning(json.warning)
      } else {
        setInviteSeatWarning(null)
      }
    } catch {
      setInviteSeatWarning(null)
    }
  }, [])

  React.useEffect(() => {
    if (isInviteOpen) {
      void loadInviteSeatPreview(inviteRole)
    } else {
      setInviteSeatWarning(null)
    }
  }, [isInviteOpen, inviteRole, loadInviteSeatPreview])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return
    setInviting(true)
    setInviteProgress(10)
    const interval = setInterval(() => {
      setInviteProgress((prev) => Math.min(prev + 15, 90))
    }, 100)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole, marn: inviteMarn }),
      });
      clearInterval(interval)
      setInviteProgress(100)
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail ? `: ${data.detail}` : ''
        throw new Error((data.error || 'Invitation failed') + detail)
      }
      if (data.billing?.warning) {
        triggerToast(`${data.billing.warning} Invite sent to ${inviteName}.`)
      } else {
        triggerToast(`Workspace invitation sent to ${inviteName}!`)
      }
      setIsInviteOpen(false)
      setInviteName("")
      setInviteEmail("")
      setInviteMarn("")
    } catch (err: any) {
      clearInterval(interval)
      triggerToast("Error: " + err.message)
    } finally {
      setInviting(false)
      setInviteProgress(0)
    }
  }

  // Branding State
  const [brandColor, setBrandColor] = React.useState(agencyProfile?.branding?.primary_color || "#111111")
  const [brandInitials, setBrandInitials] = React.useState(currentWorkspace.initials)
  React.useEffect(() => {
    if (agencyProfile?.branding) {
      setBrandColor(agencyProfile.branding.primary_color || "#111111")
    }
  }, [agencyProfile])

  const handleSaveBranding = async (updates: Record<string, unknown>) => {
    try {
      await updateBranding(updates)
      updateWorkspaceBranding(String(updates.primary_color || brandColor), brandInitials, updates.logo_url as string | undefined)
      triggerToast("Workspace branding settings updated successfully!")
    } catch (e: unknown) {
      triggerToast(e instanceof Error ? e.message : "Failed to save branding settings")
    }
  }

  // Clauses State
  const [isClauseOpen, setIsClauseOpen] = React.useState(false)
  const [clauseKey, setClauseKey] = React.useState("")
  const [clauseTitle, setClauseTitle] = React.useState("")
  const [clauseText, setClauseText] = React.useState("")

  const handleClauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clauseTitle || !clauseText) return
    await addClause({ title: clauseTitle, content: clauseText, is_mandatory: false })
    setIsClauseOpen(false)
    triggerToast(`Clause added successfully!`)
    setClauseTitle("")
    setClauseText("")
  }

  // My Profile State
  const [myFullName, setMyFullName] = React.useState(user?.user_metadata?.full_name || "")
  const [myPhone, setMyPhone] = React.useState(user?.phone || "")
  const handleSaveMyProfile = async () => {
    try {
      await updateUserProfile({ full_name: myFullName, phone: myPhone || null })
    } catch (e: unknown) {
      triggerToast(e instanceof Error ? e.message : 'Invalid profile details')
      return
    }
    triggerToast("Your profile has been updated.")
  }

  const handleSaveAgencyProfile = async (updates: Record<string, unknown>) => {
    try {
      const { parseOrThrow } = await import('@/lib/validations/fields')
      const { agencyProfileSaveSchema } = await import('@/lib/validations/schemas')
      parseOrThrow(agencyProfileSaveSchema, updates)
      await updateProfile(updates)
    } catch (e: unknown) {
      triggerToast(e instanceof Error ? e.message : 'Invalid agency profile')
      return
    }
    triggerToast("Agency profile saved successfully!");
  };

  const renderAgencyProfile = () => (
    <AgencyProfilePanel
      agencyProfile={agencyProfile}
      disabled={isSettingsRestricted}
      onSave={handleSaveAgencyProfile}
    />
  )

  const renderRmaTeam = () => (
    <RmaTeamPanel
      rmas={rmaTeamList || []}
      teamMembers={teamMembers || []}
      loading={rmaLoading}
      disabled={isSettingsRestricted}
      onSetDefault={async (id) => { await setDefaultRma(id); triggerToast("Default RMA updated"); }}
      onSetStatus={async (id, status) => { await setRmaStatus(id, status); triggerToast("RMA status updated"); }}
      onRemove={async (id) => { await removeRma(id); triggerToast("RMA removed"); }}
      onUpsert={async (payload) => { await upsertRma(payload); triggerToast("RMA added"); }}
      onSaveSignature={async (rmaId, payload) => {
        const form = new FormData()
        form.set('signature_mode', payload.signature_mode)
        if (payload.signature_text) form.set('signature_text', payload.signature_text)
        if (payload.file) form.set('file', payload.file)
        const res = await fetch(`/api/settings/rmas/${rmaId}/signature`, { method: 'PATCH', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save signature')
        await refetchRmaTeam()
        triggerToast('RMA signature saved')
      }}
    />
  )

  const renderMatterTypesSettings = () => (
    <MatterTypesSettingsPanel
      matterTypes={matterTypesList || []}
      loading={matterTypesLoading}
      disabled={isSettingsRestricted}
      onAddMatterType={addMatterType}
      onDeleteMatterType={deleteMatterType}
      onLoadFields={loadMatterTypeFields}
      onAddField={addMatterTypeField}
      onDeleteField={deleteMatterTypeField}
      onToast={triggerToast}
    />
  )

  const renderPaymentSchedulesSettings = () => (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-semibold">Payment schedules available in the Agreement Wizard fees step.</p>
      <SettingsListEditor
        items={(paymentSchedulesList || []).map((p: any) => ({ id: p.id, label: p.label }))}
        loading={paymentSchedulesLoading}
        placeholder="Add custom payment schedule..."
        disabled={isSettingsRestricted}
        onAdd={async (label) => { await addSchedule(label); triggerToast("Payment schedule added"); }}
        onDelete={async (id) => { await deleteSchedule(id); triggerToast("Payment schedule removed"); }}
      />
      {!isSettingsRestricted && (
        <Button type="button" onClick={() => triggerToast("Payment schedules saved")} className="rounded-xl bg-[#111111] font-bold">Save Settings</Button>
      )}
    </div>
  )

  const renderDefaultsSettings = () => (
    <DefaultsPanel
      defaults={agencyProfile?.defaults}
      disabled={isSettingsRestricted}
      onSave={async (updates) => {
        await updateDefaults(updates);
        triggerToast("Defaults saved successfully!");
      }}
    />
  )

  const renderFinancialSettings = () => (
    <FinancialSettingsPanel
      defaults={agencyProfile?.defaults}
      disabled={isSettingsRestricted}
      onSave={async (updates) => {
        await updateDefaults(updates);
        triggerToast("Financial settings saved successfully!");
      }}
    />
  )

  const renderBranding = () => (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FAFAFA] text-[#111111]">
          <Palette className="h-3.5 w-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-700">Branding & Agreement Identity</h4>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
            Upload your agency logo, configure agreement numbering, and set colours used across the dashboard, preview, PDF, and emails.
          </p>
        </div>
      </div>

      <BrandingSettingsPanel
        branding={agencyProfile?.branding}
        disabled={isSettingsRestricted}
        brandColor={brandColor}
        onBrandColorChange={setBrandColor}
        onSave={handleSaveBranding}
        onToast={triggerToast}
        onLogoUploaded={(url) => updateWorkspaceBranding(brandColor, brandInitials, url || undefined)}
      />
    </div>
  )

  const renderTeamSetup = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Workspace Team Members ({teamMembers ? teamMembers.length : 1})</h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Active practitioners and administrative seats.</p>
        </div>
        {!isSettingsRestricted && (
          <Button
            onClick={() => setIsInviteOpen(true)}
            size="sm"
            className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222] self-start"
          >
            <Plus className="h-4 w-4 mr-1" /> Invite Practitioner
          </Button>
        )}
      </div>

      {/* Team Table */}
      <div className="rounded-2xl border border-slate-200/50 overflow-x-auto bg-white shadow-sm mb-6">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Login</th>
              <th className="p-4">Created At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium">Loading team members...</td></tr>
            ) : teamMembers.map((member: any) => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-[#111111]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: currentWorkspace.color }}>
                      {member.full_name?.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <span>{member.full_name}</span>
                    {member.id === user?.id && <span className="rounded bg-slate-100 text-slate-500 px-1.5 py-0.5 text-[9px] font-bold">You</span>}
                  </div>
                </td>
                <td className="p-4 text-slate-500 font-medium">{member.email}</td>
                <td className="p-4">
                  <select 
                    value={member.role}
                    onChange={(e) => updateRole(member.id, e.target.value)}
                    disabled={isSettingsRestricted || member.id === user?.id}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:bg-slate-50"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="agent">Migration Agent</option>
                    <option value="manager">Case Manager</option>
                    <option value="support">Assistant</option>
                    <option value="viewer">Read-only staff</option>
                  </select>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${member.is_active ? 'bg-[#FAFAFA] text-[#111111]' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${member.is_active ? 'bg-[#FAFAFA]0' : 'bg-slate-400'}`}></span>
                    {member.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-4 text-slate-400">{member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}</td>
                <td className="p-4 text-slate-400">{new Date(member.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {!isSettingsRestricted && member.id !== user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => updateStatus(member.id, !member.is_active)}>
                          {member.is_active ? 'Disable User' : 'Reactivate User'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => removeMember(member.id)} className="text-red-600 focus:text-red-600">
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations Table */}
      {(invitations && invitations.length > 0) && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-[#111111] mb-3 uppercase tracking-wider">Pending Invitations</h4>
          <div className="rounded-2xl border border-slate-200/50 overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Sent At</th>
                  <th className="p-4">Expires At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{inv.email}</td>
                    <td className="p-4 text-slate-500 capitalize">{inv.role}</td>
                    <td className="p-4 text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-400">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => cancelInvite(inv.id)}>
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Matrix */}
      <div>
        <h4 className="text-xs font-bold text-[#111111] mb-3 uppercase tracking-wider">Role Permissions Matrix</h4>
        <div className="rounded-2xl border border-slate-200/50 overflow-hidden bg-white/40 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Capability</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Agent</th>
                  <th className="p-3 text-center">Case Admin</th>
                  <th className="p-3 text-center">Assistant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {[
                  ["Sign & Send Agreements", "Full Access", "Full Access", "Create only", "Draft only"],
                  ["Update Legal Templates", "Full Access", "RMA Approval", "View Only", "Locked"],
                  ["DHA/OMARA Audit Export", "Full Access", "RMA Specific", "Locked", "Locked"],
                  ["Workspace Branding", "Full Access", "View Only", "Locked", "Locked"],
                  ["Billing & Stripe Controls", "Full Access", "Locked", "Locked", "Locked"]
                ].map(([capability, owner, agent, manager, assistant]) => (
                  <tr key={capability} className="hover:bg-white/40 transition-colors">
                    <td className="p-3 font-bold text-[#111111]">{capability}</td>
                    <td className="p-3 text-center font-semibold text-[#5C5C5C] bg-[#FAFAFA]/10">{owner}</td>
                    <td className="p-3 text-center font-semibold text-slate-500">{agent}</td>
                    <td className="p-3 text-center font-semibold text-slate-500">{manager}</td>
                    <td className="p-3 text-center font-semibold text-slate-400">{assistant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  const renderClauses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Visa Clause Libraries ({clausesList?.length || 0})</h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Reusable legal boilerplate and terms to drag-and-drop into service agreements.</p>
        </div>
        {!isSettingsRestricted && (
          <Button
            onClick={() => setIsClauseOpen(true)}
            size="sm"
            className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Clause
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {clausesList?.map((clause: any) => (
          <div key={clause.id} className="rounded-xl border border-slate-200/50 bg-white p-5 shadow-sm hover:border-slate-350/50 transition-all duration-200">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold text-[#111111] bg-[#FAFAFA] border border-[#E7E7E7] px-2 py-0.5 rounded">
                  {clause.is_mandatory ? "MANDATORY" : "OPTIONAL"}
                </span>
                <h4 className="text-sm font-bold text-[#111111]">{clause.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">{clause.content}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteClause(clause.id)} className="h-8 w-8 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!clausesList || clausesList.length === 0) && (
          <div className="p-8 text-center text-slate-500 text-sm border border-slate-200/50 rounded-xl bg-slate-50/50">
            No clauses found. Add one to get started.
          </div>
        )}
      </div>
    </div>
  )

  const renderMyProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-black shadow"
          style={{ backgroundColor: currentWorkspace.color }}
        >
          {user?.user_metadata?.full_name ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("") : "U"}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#111111]">{myFullName || user?.email || "Unknown User"}</h4>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">{user?.email || ""}</p>
          <span className="mt-2 inline-block rounded bg-[#FAFAFA] border border-[#E7E7E7] px-2 py-0.5 text-xs font-bold text-[#111111] capitalize">{currentRole}</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Full Name
          <Input value={myFullName} onChange={(e) => setMyFullName(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-white" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Work Email
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue={user?.email || ""} disabled />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Personal MARN (If applicable)
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue={user?.marn || ""} disabled />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Practitioner Phone
          <PhoneInput value={myPhone} onChange={setMyPhone} className="h-11 rounded-xl border-slate-200 bg-white" />
        </label>
      </div>

      <Button onClick={handleSaveMyProfile} disabled={userLoading} className="rounded-xl bg-[#111111] font-bold shadow-sm hover:bg-[#222222]">Save Profile</Button>

      <ProfessionalSignaturePanel onToast={triggerToast} />
    </div>
  )

  const renderSecurityCenter = () => (
    <SecurityCenterPanel
      activeTab={securityTab}
      onTabChange={(tab) => {
        setSecurityTab(tab)
        const url = new URL(window.location.href)
        url.searchParams.set("section", "Security")
        url.searchParams.set("tab", tab)
        window.history.replaceState({}, "", url.toString())
      }}
      onToast={triggerToast}
    />
  )

  const renderContent = () => {
    switch (activeSectionKey) {
      case "Agency":
        return renderAgencyProfile()
      case "RmaTeam":
        return renderRmaTeam()
      case "Branding":
        return renderBranding()
      case "Clauses":
        return renderClauses()
      case "MatterTypes":
        return renderMatterTypesSettings()
      case "PaymentSchedules":
        return renderPaymentSchedulesSettings()
      case "Defaults":
        return renderDefaultsSettings()
      case "Financial":
        return renderFinancialSettings()
      case "Profile":
        return renderMyProfile()
      case "Security":
      case "MFA":
        return renderSecurityCenter()
      case "Notifications":
        return <NotificationPreferencesPanel />
      default:
        return renderAgencyProfile()
    }
  }

  return (
    <div className="relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-4 w-4 text-[#111111]" />
          {toastMessage}
        </div>
      )}

      {/* Invite Practitioner Drawer Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">Invite OMARA Practitioner</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Practitioner Full Name
              <Input
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white"
                placeholder="e.g. Jane Smith"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Work Email Address
              <Input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white"
                placeholder="e.g. priya@avcmigration.com.au"
              />
            </label>
            <div className="grid gap-4 grid-cols-2">
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                Practitioner Role
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Migration Agent</option>
                  <option value="manager">Case Manager</option>
                  <option value="viewer">Read-only staff</option>
                  <option value="support">Assistant</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                MARN Code (7-digits)
                <DigitsInput
                  value={inviteMarn}
                  onChange={setInviteMarn}
                  maxDigits={7}
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  placeholder="e.g. 2189402"
                />
              </label>
            </div>

            {inviteSeatWarning && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                {inviteSeatWarning}
              </div>
            )}

            {inviting && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#111111]">
                  <span>Provisioning secure license...</span>
                  <span>{inviteProgress}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#111111] transition-all duration-150" style={{ width: `${inviteProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button type="submit" disabled={inviting} className="rounded-xl h-11 text-xs font-bold bg-[#111111] hover:bg-[#222222]">Send Invite Link</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Clause Drawer Dialog */}
      <Dialog open={isClauseOpen} onOpenChange={setIsClauseOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">Create Boileplate Clause</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClauseSubmit} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Library Code Key
              <Input
                required
                value={clauseKey}
                onChange={(e) => setClauseKey(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-mono uppercase"
                placeholder="e.g. CLAUSE-AUDIT-DISCLAIMER"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Display Title
              <Input
                required
                value={clauseTitle}
                onChange={(e) => setClauseTitle(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white"
                placeholder="e.g. 7-Year OMARA Custody Mandate"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Boilerplate Text
              <textarea
                required
                value={clauseText}
                onChange={(e) => setClauseText(e.target.value)}
                className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
                placeholder="Enter the full legal wording of the clause..."
              />
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsClauseOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button type="submit" className="rounded-xl h-11 text-xs font-bold bg-[#111111] hover:bg-[#222222]">Save to Library</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PageHeader eyebrow="Settings" title={currentTitle} description="Enterprise-grade configuration for your agency, team, templates, security and defaults." />

      {/* Role Restriction Banner */}
      {isSettingsRestricted && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-center gap-3 text-xs text-amber-800 font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Restricted Workspace View:</span> Your active simulated role is <span className="font-bold underline">{currentRole}</span>. Settings edits and team invites are locked. Switch to <span className="font-bold">Owner</span> or <span className="font-bold">Admin</span> in the sidebar simulator to test writing.
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Settings Navigation Sidebar */}
        <Card className="h-fit rounded-2xl border border-slate-200/50 bg-white/60 p-3 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-0 space-y-4">
            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workspace settings</div>
              <div className="space-y-1 mt-1">
                {workspaceItems.map(([item, target]) => (
                  <Link
                    key={item}
                    href={`/workspace/${currentSlug}/settings?section=${target}`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${target === activeSectionKey ? "bg-[#111111] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span>{item}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Personal settings</div>
              <div className="space-y-1 mt-1">
                {personalItems.map(([item, target]) => (
                  <Link
                    key={item}
                    href={`/workspace/${currentSlug}/settings?section=${target}&tab=profile`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${target === activeSectionKey ? "bg-[#111111] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span>{item}</span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Content Area */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <h2 className="text-lg font-bold tracking-tight text-[#111111] mb-5">{currentTitle}</h2>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

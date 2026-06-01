"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Check, 
  Building2, 
  Palette, 
  Users, 
  FileText, 
  Rocket, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight,
  Server
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/authStore"

export default function OnboardingPage() {
  const router = useRouter()
  const { onboardingStep, onboardingData, updateOnboardingStep, updateOnboardingData } = useAuthStore()

  // Step 1: Profile
  const [agencyName, setAgencyName] = React.useState(onboardingData.agencyName || "")
  const [slug, setSlug] = React.useState(onboardingData.slug || "")
  
  // Step 2: Branding
  const [primaryColor, setPrimaryColor] = React.useState(onboardingData.primaryColor || "#0D9F8C")
  const [logoText, setLogoText] = React.useState(onboardingData.logoText || "")

  // Step 3: Team
  const [teamName, setTeamName] = React.useState("")
  const [teamEmail, setTeamEmail] = React.useState("")
  const [teamRole, setTeamRole] = React.useState("Migration Agent")
  const [teamMarn, setTeamMarn] = React.useState("")
  const [invitedList, setInvitedList] = React.useState<Array<{ name: string; email: string; role: string; marn: string }>>(
    onboardingData.invitedStaff || []
  )

  // Step 4: Specialization & Templates
  const [specialty, setSpecialty] = React.useState(onboardingData.specialty || "skilled")
  const [selectedTemplates, setSelectedTemplates] = React.useState<string[]>(
    onboardingData.selectedTemplates || ["SC-189-RETAINER", "SC-820-RETAINER"]
  )

  // Step 5: Provisioning
  const [provisionProgress, setProvisionProgress] = React.useState(0)
  const [provisionStep, setProvisionStep] = React.useState(0)

  // Sync initials on agency name change
  React.useEffect(() => {
    if (!logoText && agencyName) {
      const initials = agencyName.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase()
      setLogoText(initials)
    }
    if (agencyName) {
      const autoSlug = agencyName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "")
      setSlug(autoSlug)
    }
  }, [agencyName])

  // Step 5 Loader triggers
  React.useEffect(() => {
    if (onboardingStep === 5) {
      setProvisionProgress(100)
    }
  }, [onboardingStep])

  React.useEffect(() => {
    if (onboardingStep === 5) {
      if (provisionProgress < 20) setProvisionStep(0)
      else if (provisionProgress < 45) setProvisionStep(1)
      else if (provisionProgress < 70) setProvisionStep(2)
      else if (provisionProgress < 90) setProvisionStep(3)
      else setProvisionStep(4)
    }
  }, [provisionProgress, onboardingStep])

  const colors = [
    { name: "Emerald Green", value: "#0D9F8C", bg: "bg-[#0D9F8C]" },
    { name: "Sapphire Blue", value: "#2563EB", bg: "bg-[#2563EB]" },
    { name: "Amber Gold", value: "#D97706", bg: "bg-[#D97706]" },
    { name: "Sovereign Slate", value: "#475569", bg: "bg-[#475569]" },
  ]

  const templatesList = [
    { id: "SC-189-RETAINER", name: "SC 189 Points Test Retainer", subclass: "SC 189 / 190" },
    { id: "SC-820-RETAINER", name: "SC 820 Partner Visa Agreement", subclass: "SC 820 / 801" },
    { id: "SC-482-SPONSOR", name: "SC 482 Employer Sponsorship Pack", subclass: "SC 482" },
    { id: "SC-143-PARENT", name: "SC 143 Contributory Parent Deed", subclass: "SC 143" },
  ]

  const handleNext = () => {
    // Save current step data
    updateOnboardingData({
      agencyName,
      slug,
      primaryColor,
      logoText,
      invitedStaff: invitedList,
      specialty,
      selectedTemplates
    })
    updateOnboardingStep(onboardingStep + 1)
  }

  const handleBack = () => {
    updateOnboardingStep(onboardingStep - 1)
  }

  const addStaff = () => {
    if (!teamName || !teamEmail) return
    setInvitedList([...invitedList, { name: teamName, email: teamEmail, role: teamRole, marn: teamMarn || "N/A" }])
    setTeamName("")
    setTeamEmail("")
    setTeamMarn("")
  }

  const removeStaff = (idx: number) => {
    setInvitedList(invitedList.filter((_, i) => i !== idx))
  }

  const toggleTemplate = (id: string) => {
    if (selectedTemplates.includes(id)) {
      setSelectedTemplates(selectedTemplates.filter(t => t !== id))
    } else {
      setSelectedTemplates([...selectedTemplates, id])
    }
  }

  const handleLaunch = () => {
    const workspaceSlug = slug || onboardingData.slug
    if (!workspaceSlug) return
    router.push(`/workspace/${workspaceSlug}/dashboard`)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-2 animate-in fade-in duration-300">
      
      {/* Dynamic Step Header */}
      {onboardingStep < 5 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
            <span>Onboarding Wizard</span>
            <span>Step {onboardingStep} of 4</span>
          </div>
          
          {/* Progress Indicators */}
          <div className="mt-3 flex gap-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step} 
                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                  step <= onboardingStep ? "bg-[#0D9F8C]" : "bg-slate-150"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: Workspace Profile */}
      {onboardingStep === 1 && (
        <div className="grid gap-5 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-3">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-[#081B2E]">Workspace Profile</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Configure your official tenant URL subdomain slug and business name.</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="agency-name" className="font-bold text-slate-700">Official Agency Name</Label>
              <Input
                id="agency-name"
                required
                placeholder="AVC Visa Associates"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="h-11 rounded-xl border-slate-200"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agency-slug" className="font-bold text-slate-700">Subdomain Slug</Label>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden pr-3 items-center">
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-3 select-none">immisign.com.au/workspace/</span>
                <Input
                  id="agency-slug"
                  required
                  placeholder="avc-visa"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  className="h-9 border-none bg-transparent font-black text-[#0D9F8C] px-1 focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-slate-400 font-semibold">Only lowercase letters, numbers, and hyphens allowed.</p>
            </div>
          </div>

          <div className="flex mt-2">
            <Button
              onClick={handleNext}
              disabled={!agencyName || !slug}
              className="h-11 w-full rounded-xl bg-[#0D9F8C] font-black hover:bg-[#0A5B52] flex items-center justify-center gap-2 group"
            >
              <span>Configure Branding & Style</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Branding Settings */}
      {onboardingStep === 2 && (
        <div className="grid gap-5 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-3">
              <Palette className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-[#081B2E]">Workspace Branding</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Select your corporate accent palette and configure dynamic sidebar logo credentials.</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Primary Brand Accent</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPrimaryColor(c.value)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 font-semibold text-xs transition-all ${
                      primaryColor === c.value 
                        ? "border-[#0D9F8C] bg-emerald-50/20 text-[#0D9F8C] shadow-subtle" 
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`h-4.5 w-4.5 rounded-full ${c.bg} border border-white/20 shadow-sm`} />
                    <span>{c.name}</span>
                    {primaryColor === c.value && <Check className="h-3.5 w-3.5 ml-auto text-[#0D9F8C]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo-text" className="font-bold text-slate-700">Workspace Logo Initials</Label>
              <Input
                id="logo-text"
                required
                maxLength={3}
                placeholder="e.g. AVC"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                className="h-11 rounded-xl border-slate-200 uppercase"
              />
            </div>

            {/* LIVE THEME PREVIEW */}
            <div className="rounded-2xl border border-slate-200/50 bg-[#F7FAF8] p-4">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Live Tenant Preview</div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-subtle flex items-center gap-3">
                <div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-white text-sm transition-all duration-300 shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  {logoText || "AM"}
                </div>
                <div>
                  <div className="text-xs font-black text-[#081B2E]">{agencyName || "Singh & Associates"}</div>
                  <div className="text-[9px] font-bold text-slate-400 mt-0.5 mt-0.5">immisign.com.au/workspace/{slug || "avc-visa"}</div>
                </div>
                <span 
                  className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ color: primaryColor, backgroundColor: `${primaryColor}12` }}
                >
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!logoText}
              className="h-11 flex-1 rounded-xl bg-[#0D9F8C] font-black hover:bg-[#0A5B52] flex items-center justify-center gap-2 group"
            >
              <span>Practitioners & Team</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Practitioners & Team */}
      {onboardingStep === 3 && (
        <div className="grid gap-5 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-[#081B2E]">Agency Team seats</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Invite additional migration practitioners and casework staff to your workspace.</p>
          </div>

          <div className="grid gap-3 border border-slate-150 rounded-2xl p-4 bg-slate-50/30">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Add Member Invitation</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">Full Name</span>
                <Input
                  placeholder="Priya Mehta"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 text-xs"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">Work Email</span>
                <Input
                  placeholder="priya@agency.com.au"
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 text-xs"
                />
              </label>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">RMA MARN (Optional)</span>
                <Input
                  placeholder="e.g. 2189402"
                  value={teamMarn}
                  onChange={(e) => setTeamMarn(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 text-xs"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">System Permission Role</span>
                <select 
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value="Migration Agent">Migration Agent</option>
                  <option value="Case Manager">Case Manager</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Read-only staff">Read-only staff</option>
                </select>
              </label>
            </div>

            <Button
              type="button"
              onClick={addStaff}
              disabled={!teamName || !teamEmail}
              className="h-9 rounded-lg bg-[#0D9F8C] hover:bg-[#0A5B52] text-xs font-black mt-2 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Invite to Workspace
            </Button>
          </div>

          {/* PENDING INVITES LIST */}
          <div className="space-y-2.5">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Invited Staff ({invitedList.length})</div>
            {invitedList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-400 bg-white">
                No team invites added yet. You can also configure them later in Settings.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                {invitedList.map((staff, idx) => (
                  <div key={staff.email} className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#081B2E]">{staff.name}</div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">
                        {staff.email} • {staff.marn !== "N/A" ? `MARN ${staff.marn}` : "No MARN"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                        {staff.role}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStaff(idx)}
                        className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleNext}
              className="h-11 flex-1 rounded-xl bg-[#0D9F8C] font-black hover:bg-[#0A5B52] flex items-center justify-center gap-2 group"
            >
              <span>Seed OMARA Templates</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Practice Specialization & OMARA Template Packages */}
      {onboardingStep === 4 && (
        <div className="grid gap-5 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-[#081B2E]">Document Templates</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Pre-seed your new isolated workspace library with compliant OMARA agreement agreements.</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Workspace Core Speciality</span>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {["skilled", "partner"].map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecialty(spec)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      specialty === spec 
                        ? "border-[#0D9F8C] bg-emerald-50/20 shadow-subtle" 
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-black text-[#081B2E] capitalize">
                      {spec === "skilled" ? "Skilled Migration" : "Family & Partner"}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">
                      {spec === "skilled" ? "SC 189, 190, 482 visa classes." : "SC 820, 309, 143 parental streams."}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Boilerplate Service Agreements</span>
              <div className="grid gap-2 mt-1">
                {templatesList.map((tpl) => {
                  const isChecked = selectedTemplates.includes(tpl.id)
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => toggleTemplate(tpl.id)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isChecked 
                          ? "border-[#0D9F8C] bg-emerald-50/10 shadow-subtle" 
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[#081B2E]">{tpl.name}</div>
                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {tpl.subclass} Defaults
                        </span>
                      </div>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isChecked ? "bg-[#0D9F8C] border-[#0D9F8C] text-white" : "border-slate-300"
                      }`}>
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedTemplates.length === 0}
              className="h-11 flex-1 rounded-xl bg-[#0D9F8C] font-black hover:bg-[#0A5B52] flex items-center justify-center gap-2 group"
            >
              <span>Initialize Workspace</span>
              <Rocket className="h-4 w-4 transition-transform group-hover:scale-110" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Provisioning Loader */}
      {onboardingStep === 5 && (
        <div className="grid gap-6 py-6 text-center animate-in scale-in duration-300">
          <div>
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#0D9F8C] mb-5 shadow-md">
              <Server className="h-8 w-8 animate-pulse text-[#0D9F8C]" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 font-black text-[9px] text-white ring-2 ring-white">
                ✓
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#081B2E]">Initializing Tenant</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Setting up your isolated agency workspace vault on sovereign Australian servers.</p>
          </div>

          {/* Progress Percent */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black text-[#0D9F8C]">
              <span>Provisioning State</span>
              <span>{Math.round(provisionProgress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#33C48D] to-[#0D9F8C] rounded-full transition-all duration-300"
                style={{ width: `${provisionProgress}%` }}
              />
            </div>
          </div>

          {/* Provision Step Checklist */}
          <div className="rounded-2xl border border-slate-200/50 bg-[#F7FAF8] p-5 text-left space-y-3.5 shadow-subtle">
            {[
              "Deploying isolated database container...",
              "Configuring primary accent themes...",
              "Seeding practitioners invite tokens...",
              "Indexing OMARA compliance libraries...",
              "Workspace active and secure."
            ].map((stepMsg, idx) => {
              const isDone = provisionStep > idx
              const isActive = provisionStep === idx
              return (
                <div 
                  key={stepMsg} 
                  className={`flex items-center gap-3 transition-opacity duration-300 ${
                    isDone ? "opacity-100" : isActive ? "opacity-100" : "opacity-35"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isDone 
                      ? "bg-[#0D9F8C] border-[#0D9F8C] text-white" 
                      : isActive 
                        ? "border-[#0D9F8C] text-[#0D9F8C] animate-spin border-t-transparent" 
                        : "border-slate-350"
                  }`}>
                    {isDone && <Check className="h-3 w-3" />}
                  </div>
                  <span className={`text-xs font-bold ${
                    isDone ? "text-slate-800" : isActive ? "text-[#0D9F8C]" : "text-slate-400"
                  }`}>
                    {stepMsg}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Launch Button */}
          <div className="flex mt-2">
            <Button
              onClick={handleLaunch}
              disabled={provisionProgress < 100}
              className="h-12 w-full rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52] shadow-sm flex items-center justify-center gap-2 group disabled:opacity-40"
            >
              <span>Launch {agencyName || "AVC Migration"} Workspace</span>
              <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

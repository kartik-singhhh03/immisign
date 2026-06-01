"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LockKeyhole, ShieldCheck, ArrowRight, Terminal, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

const isDevEnvironment = process.env.NODE_ENV === 'development'

export default function LoginPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  // Form states
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("••••••••••••")
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadingMsg, setLoadingMsg] = React.useState("")
  
  // Custom workspace detection state
  const [detectedWorkspace, setDetectedWorkspace] = React.useState<{ name: string; slug: string; color: string } | null>(null)
  
  // Collapsible Developer Panel state
  const [showDevPanel, setShowDevPanel] = React.useState(true)

  const resolveSignedInWorkspace = async (
    userId: string,
    fallback: { slug: string; name: string },
  ) => {
    const { data: profile, error: profileError } = await (supabase as any)
      .from("users")
      .select("agency_id")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.agency_id) {
      return fallback
    }

    const { data: agency, error: agencyError } = await (supabase as any)
      .from("agencies")
      .select("name, slug")
      .eq("id", profile.agency_id)
      .single()

    if (agencyError || !agency?.slug) {
      return fallback
    }

    return {
      slug: agency.slug,
      name: agency.name || fallback.name,
    }
  }

  // Quick Login seeded accounts
  const demoAccounts = [
    { name: "Rajwant Singh", email: "testowner_1780228890060@demoagency.com", role: "Agency Owner", workspace: "AVC Migration", slug: "valid-agency-1780228892494", color: "#0D9F8C", initial: "RS" },
    { name: "Priya Mehta", email: "agent@demoagency.com", role: "Migration Agent", workspace: "AVC Migration", slug: "avc-migration", color: "#0D9F8C", initial: "PM" },
    { name: "Sarah Jenkins", email: "manager@demoagency.com", role: "Case Manager", workspace: "Global Visa Partners", slug: "global-visa", color: "#2563EB", initial: "SJ" },
    { name: "Aman Gill", email: "assistant@demoagency.com", role: "Assistant", workspace: "AVC Migration", slug: "avc-migration", color: "#0D9F8C", initial: "AG" },
  ]

  // Detect workspace on email change
  React.useEffect(() => {
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail.includes("@")) {
      setDetectedWorkspace(null)
      return
    }

    const domain = cleanEmail.split("@")[1]
    if (domain === "avcmigration.com.au" || cleanEmail === "owner@demoagency.com" || cleanEmail === "agent@demoagency.com" || cleanEmail === "assistant@demoagency.com") {
      setDetectedWorkspace({
        name: "AVC Migration",
        slug: "avc-migration",
        color: "#0D9F8C"
      })
    } else if (domain === "globalvisa.com.au" || cleanEmail === "manager@demoagency.com") {
      setDetectedWorkspace({
        name: "Global Visa Partners",
        slug: "global-visa",
        color: "#2563EB"
      })
    } else if (domain === "sydneymigration.com.au") {
      setDetectedWorkspace({
        name: "Sydney Migration Group",
        slug: "sydney-migration",
        color: "#D97706"
      })
    } else {
      // General dynamic detect based on domain name
      const domainName = domain.split(".")[0]
      const capitalized = domainName.charAt(0).toUpperCase() + domainName.slice(1)
      setDetectedWorkspace({
        name: `${capitalized} Migration`,
        slug: `${domainName}-migration`,
        color: "#0D9F8C"
      })
    }
  }, [email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setLoadingMsg("Authenticating...")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login failed: " + error.message)
      setIsLoading(false)
      return
    }

    const workspace = await resolveSignedInWorkspace(data.user.id, {
      slug: detectedWorkspace?.slug || "avc-migration",
      name: detectedWorkspace?.name || "AVC Migration",
    })
    setLoadingMsg(`Routing into ${workspace.name} workspace...`)
    
    router.push(`/workspace/${workspace.slug}/dashboard`)
  }

  const handleQuickLogin = async (demoEmail: string, slug: string, workspaceName: string) => {
    setIsLoading(true)
    setEmail(demoEmail)
    setLoadingMsg(`Authenticating as ${workspaceName} user...`)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: "password123", // Use the seeded dummy password
    })

    if (error) {
      alert("Login failed: " + error.message)
      setIsLoading(false)
      return
    }

    const workspace = await resolveSignedInWorkspace(data.user.id, { slug, name: workspaceName })
    setLoadingMsg(`Entering ${workspace.name} safe workspace...`)
    router.push(`/workspace/${workspace.slug}/dashboard`)
  }

  return (
    <div className="animate-in fade-in-50 duration-300">
      
      {/* Dynamic Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Enterprise Multi-Tenant Environment
        </div>
        
        {detectedWorkspace ? (
          <div className="mt-5 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-white text-sm shadow-md"
              style={{ backgroundColor: detectedWorkspace.color }}
            >
              {detectedWorkspace.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Tenant</span>
              <h1 className="text-2xl font-black tracking-tight text-[#081B2E] leading-tight">
                {detectedWorkspace.name} Workspace
              </h1>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-[#081B2E]">
              Practitioner Access
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Access your agency&apos;s isolated secure space. Enter your domain-mapped email.
            </p>
          </div>
        )}
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleLogin} className="grid gap-4">
        
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">
            Work Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              required
              placeholder="name@agency.com.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-slate-200 bg-white pr-10 font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
              disabled={isLoading}
            />
            {detectedWorkspace && (
              <span className="absolute right-3.5 top-1/2 flex h-2.5 w-2.5 -translate-y-1/2 rounded-full animate-pulse" style={{ backgroundColor: detectedWorkspace.color }} />
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-bold text-slate-700">
              Security Password
            </Label>
            <Link href="/forgot-password" className="text-sm font-bold text-[#0D9F8C] hover:underline">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-slate-200 bg-white font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            disabled={isLoading}
          />
        </div>

        {/* Dynamic Workspace Alert Box */}
        {detectedWorkspace && (
          <div className="rounded-xl border bg-slate-50/50 p-4 text-xs font-semibold text-slate-600 flex items-start gap-3 border-emerald-500/10 animate-in fade-in duration-300">
            <Sparkles className="h-4 w-4 shrink-0 text-[#0D9F8C] mt-0.5" />
            <div>
              <p className="text-slate-800 font-bold">Dynamic Tenant Resolved</p>
              <p className="mt-0.5 leading-relaxed text-slate-500">
                ImmiSign auto-detects that you belong to <strong className="text-slate-800">{detectedWorkspace.name}</strong>. Logging in will securely route you to <code className="rounded bg-slate-100 px-1 py-0.5">/workspace/{detectedWorkspace.slug}</code>.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#F7FAF8] px-4 py-3">
          <label htmlFor="remember" className="flex items-center gap-3 text-xs font-bold text-slate-600 cursor-pointer">
            <Checkbox id="remember" />
            Remember practitioner session
          </label>
          <LockKeyhole className="h-3.5 w-3.5 text-[#0D9F8C]" />
        </div>

        <Button 
          type="submit" 
          className="h-12 rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52] shadow-sm flex items-center justify-center gap-2 group"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{loadingMsg}</span>
            </div>
          ) : (
            <>
              <span>{detectedWorkspace ? `Enter ${detectedWorkspace.name}` : "Continue to Workspace"}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* SSO Dividers */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-150" />
        </div>
        <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Enterprise SSO Direct</span>
      </div>

      {/* Google and MS SSO Buttons — dev-only quick login stubs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button 
          variant="outline" 
          type="button" 
          disabled={isLoading || !isDevEnvironment}
          onClick={() => isDevEnvironment && handleQuickLogin("testowner_1780228890060@demoagency.com", "valid-agency-1780228890060", "AVC Migration")}
          className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 text-slate-700"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Workspace SSO
        </Button>
        <Button 
          variant="outline" 
          type="button" 
          disabled={isLoading}
          onClick={() => isDevEnvironment && handleQuickLogin("manager@demoagency.com", "global-visa", "Global Visa Partners")}
          className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 text-slate-700"
        >
          <svg className="h-4 w-4 text-[#0078D4]" viewBox="0 0 23 23" fill="currentColor"><path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/></svg>
          Microsoft Entra ID
        </Button>
      </div>

      {/* DEVELOPER STAGING DEMO ACCOUNTS PANEL — hidden in production builds */}
      {isDevEnvironment && (
      <div className="mt-6 rounded-2xl border border-dashed border-emerald-500/30 bg-[#F5FAF7] p-5">
        <button 
          type="button"
          onClick={() => setShowDevPanel(!showDevPanel)}
          className="flex w-full items-center justify-between font-bold text-[#0D9F8C] hover:text-[#0A5B52] transition-colors"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
            <Terminal className="h-4 w-4" />
            Developer Staging Accounts
          </div>
          <span className="text-xs rounded bg-emerald-100/50 px-2 py-0.5 text-emerald-800">
            {showDevPanel ? "Collapse" : "Expand"}
          </span>
        </button>
        
        {showDevPanel && (
          <div className="mt-4 grid gap-3 animate-in fade-in-50 duration-300">
            <p className="text-[11px] font-semibold text-slate-500 leading-normal">
              Click any profile below to bypass standard SSO credentials, seed the correct roles, and simulate tenant routing policies:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(account.email, account.slug, account.workspace)}
                  className="flex items-center text-left gap-3 rounded-xl border border-slate-200/50 bg-white p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-subtle hover:border-slate-350"
                >
                  <div 
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black text-white text-xs"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-[#081B2E] truncate">{account.name}</div>
                    <div className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{account.role}</div>
                    <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded mt-1 inline-block">
                      {account.workspace}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        New Agency?{" "}
        <Link href="/signup" className="font-black text-[#0D9F8C] hover:underline">
          Setup dynamic workspace trial
        </Link>
      </p>
    </div>
  )
}

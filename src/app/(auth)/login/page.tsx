"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LockKeyhole, ShieldCheck, ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadingMsg, setLoadingMsg] = React.useState("")
  const [detectedWorkspace, setDetectedWorkspace] = React.useState<{ name: string; slug: string; color: string } | null>(null)

  const resolveSignedInWorkspace = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("agency_id")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.agency_id) {
      return null
    }

    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("name, slug")
      .eq("id", profile.agency_id)
      .single()

    if (agencyError || !agency?.slug) {
      return null
    }

    return {
      slug: agency.slug,
      name: agency.name || agency.slug,
    }
  }

  React.useEffect(() => {
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail.includes("@")) {
      setDetectedWorkspace(null)
      return
    }

    const domain = cleanEmail.split("@")[1]
    const domainName = domain.split(".")[0]
    const capitalized = domainName.charAt(0).toUpperCase() + domainName.slice(1)
    setDetectedWorkspace({
      name: `${capitalized} Workspace`,
      slug: domainName.replace(/[^a-z0-9-]/g, "-"),
      color: "#111111",
    })
  }, [email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

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

    const workspace = await resolveSignedInWorkspace(data.user.id)
    if (!workspace) {
      setLoadingMsg("Completing workspace setup...")
      router.push("/onboarding")
      return
    }

    setLoadingMsg(`Routing into ${workspace.name} workspace...`)
    router.push(`/workspace/${workspace.slug}/dashboard`)
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setLoadingMsg("Redirecting to Google...")
    const redirectTo = `${window.location.origin}/login`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) {
      alert("Google login failed: " + error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in-50 duration-300">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-black text-[#111111]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Enterprise Multi-Tenant Environment
        </div>

        {detectedWorkspace ? (
          <div className="mt-5 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-white text-sm shadow-md"
              style={{ backgroundColor: detectedWorkspace.color }}
            >
              {detectedWorkspace.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Tenant</span>
              <h1 className="text-2xl font-black tracking-tight text-[#111111] leading-tight">
                {detectedWorkspace.name}
              </h1>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-[#111111]">
              Practitioner Access
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Access your agency&apos;s isolated secure space. Enter your domain-mapped email.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleLogin} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">
            Work Email Address
          </Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="name@agency.com.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-slate-200 bg-white font-medium focus-visible:ring-1 focus-visible:ring-[#111111]"
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-bold text-slate-700">
              Security Password
            </Label>
            <Link href="/forgot-password" className="text-sm font-bold text-[#111111] hover:underline">
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
            className="h-12 rounded-xl border-slate-200 bg-white font-medium focus-visible:ring-1 focus-visible:ring-[#111111]"
            disabled={isLoading}
          />
        </div>

        {detectedWorkspace && (
          <div className="rounded-xl border bg-slate-50/50 p-4 text-xs font-semibold text-slate-600 flex items-start gap-3 border-[#E7E7E7]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#111111] mt-0.5" />
            <div>
              <p className="text-slate-800 font-bold">Dynamic Tenant Resolved</p>
              <p className="mt-0.5 leading-relaxed text-slate-500">
                After sign-in, ImmiMate routes you to your agency workspace when configured.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAFAFA] px-4 py-3">
          <label htmlFor="remember" className="flex items-center gap-3 text-xs font-bold text-slate-600 cursor-pointer">
            <Checkbox id="remember" />
            Remember practitioner session
          </label>
          <LockKeyhole className="h-3.5 w-3.5 text-[#111111]" />
        </div>

        <Button
          type="submit"
          className="h-12 rounded-xl bg-[#111111] text-base font-black hover:bg-[#222222] shadow-sm flex items-center justify-center gap-2 group"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{loadingMsg}</span>
            </div>
          ) : (
            <>
              <span>Continue to Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-150" />
        </div>
        <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Enterprise SSO Direct</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading}
          onClick={handleGoogleLogin}
          className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 text-slate-700"
        >
          Continue with Google
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled
          className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
        >
          Microsoft — Coming soon
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New Agency?{" "}
        <Link href="/signup" className="font-black text-[#111111] hover:underline">
          Setup dynamic workspace trial
        </Link>
      </p>
    </div>
  )
}

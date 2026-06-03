"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/authStore"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { updateOnboardingData, updateOnboardingStep } = useAuthStore()
  const [error, setError] = React.useState<string | null>(null)

  // Form states
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [agencyName, setAgencyName] = React.useState("")
  const [marn, setMarn] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [teamSize, setTeamSize] = React.useState("1")
  const [specialty, setSpecialty] = React.useState("skilled")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agencyName || !email || !password) return

    setIsLoading(true)
    setError(null)

    const generatedSlug = agencyName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          agencyName,
          slug: generatedSlug || "new-agency",
          marn,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Signup failed")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError

      updateOnboardingData({
        agencyName,
        slug: data.agency_slug || generatedSlug,
        teamSize,
        specialty,
        invitedStaff: [],
        primaryColor: "#0D9F8C",
        logoText: agencyName.split(" ").map((w) => w[0]).join("").substring(0, 3).toUpperCase(),
      })

      updateOnboardingStep(2)
      router.push("/onboarding")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}/onboarding`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in-50 duration-300">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C]">
          <Sparkles className="h-3.5 w-3.5" />
          14-day free trial • Multi-Tenant Enterprise
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#081B2E]">
          Create Agency Workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Provision a brand new isolated workspace. No credit card required.
        </p>
      </div>

      <form onSubmit={handleSignupSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <Label htmlFor="first-name" className="font-bold text-slate-700">First name</Label>
            <Input
              id="first-name"
              required
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
          </label>
          <label className="grid gap-2">
            <Label htmlFor="last-name" className="font-bold text-slate-700">Last name</Label>
            <Input
              id="last-name"
              required
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <Label htmlFor="agency" className="font-bold text-slate-700">Agency name</Label>
            <Input
              id="agency"
              required
              placeholder="Your Migration Agency"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
          </label>
          <label className="grid gap-2">
            <Label htmlFor="marn" className="font-bold text-slate-700">Principal MARN (7-digit)</Label>
            <Input
              id="marn"
              required
              placeholder="e.g. 1794016"
              value={marn}
              onChange={(e) => setMarn(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
          </label>
        </div>
        
        <label className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="jane@agency.com.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-bold text-slate-500">Agency Size</span>
            <select 
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            >
              <option value="1">Solo RMA</option>
              <option value="2-5">2-5 Practitioners</option>
              <option value="6-15">6-15 Practitioners</option>
              <option value="15+">15+ Enterprise</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold text-slate-500">Primary Specialisation</span>
            <select 
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            >
              <option value="skilled">Skilled SC 189/190</option>
              <option value="partner">Partner SC 820/309</option>
              <option value="parent">Parent SC 143</option>
              <option value="employer">Employer Sponsored SC 482</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <Label htmlFor="password" className="font-bold text-slate-700">Create password</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="h-12 rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52] shadow-sm flex items-center justify-center gap-2 group mt-2"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Provision Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 grid gap-2.5 rounded-xl border border-emerald-100 bg-[#F7FAF8] p-4 text-xs font-bold text-slate-700">
        {["Custom workspace subdomain setup", "Instant template package mapping", "OMARA compliance sandbox"].map((benefit) => (
          <div key={benefit} className="flex items-center gap-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#0D9F8C] shrink-0" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-[#0D9F8C] hover:underline">
          Sign in
        </Link>
      </p>
      <Button type="button" variant="outline" onClick={handleGoogleSignup} disabled={isLoading} className="mt-3 w-full h-11 rounded-xl border-slate-200 bg-white">
        Continue with Google
      </Button>
    </div>
  )
}

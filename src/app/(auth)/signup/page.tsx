"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/authStore"
import { createClient } from "@/lib/supabase/client"
import {
  normalizeWorkspaceSlug,
  slugifyAgencyName,
  validateWorkspaceSlug,
} from "@/lib/workspace/slug"

type SlugCheckState = "idle" | "checking" | "available" | "taken" | "invalid"

export default function SignupPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { updateOnboardingData, updateOnboardingStep } = useAuthStore()
  const [error, setError] = React.useState<string | null>(null)
  const [slugSuggestions, setSlugSuggestions] = React.useState<string[]>([])

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [agencyName, setAgencyName] = React.useState("")
  const [workspaceSlug, setWorkspaceSlug] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [slugCheck, setSlugCheck] = React.useState<SlugCheckState>("idle")
  const [marn, setMarn] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [teamSize, setTeamSize] = React.useState("1")
  const [specialty, setSpecialty] = React.useState("skilled")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const appHost =
    typeof window !== "undefined"
      ? window.location.host
      : "app.immimate.com"

  React.useEffect(() => {
    if (!agencyName.trim()) return
    if (slugTouched) return
    setWorkspaceSlug(slugifyAgencyName(agencyName) || "")
  }, [agencyName, slugTouched])

  React.useEffect(() => {
    const slug = workspaceSlug.trim()
    if (!slug) {
      setSlugCheck("idle")
      setSlugSuggestions([])
      return
    }

    const local = validateWorkspaceSlug(slug)
    if (!local.valid) {
      setSlugCheck("invalid")
      setSlugSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSlugCheck("checking")
      try {
        const res = await fetch(
          `/api/auth/workspace-slug?slug=${encodeURIComponent(local.slug)}`,
        )
        const data = await res.json()
        if (data.available) {
          setSlugCheck("available")
          setSlugSuggestions([])
        } else {
          setSlugCheck("taken")
          setSlugSuggestions(data.suggestions || [])
        }
      } catch {
        setSlugCheck("idle")
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [workspaceSlug])

  const slugValidation = validateWorkspaceSlug(workspaceSlug)
  const canSubmit =
    agencyName &&
    email &&
    password &&
    slugValidation.valid &&
    slugCheck === "available"

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsLoading(true)
    setError(null)
    setSlugSuggestions([])

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
          slug: slugValidation.slug,
          marn,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === "SLUG_TAKEN" && Array.isArray(data.suggestions)) {
          setSlugSuggestions(data.suggestions)
          setSlugCheck("taken")
        }
        throw new Error(data.error || "Signup failed")
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError

      const finalSlug = data.agency_slug || slugValidation.slug

      updateOnboardingData({
        agencyName,
        slug: finalSlug,
        teamSize,
        specialty,
        invitedStaff: [],
        primaryColor: "#111111",
        logoText: agencyName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .substring(0, 3)
          .toUpperCase(),
      })

      updateOnboardingStep(2)
      router.push("/onboarding")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}/onboarding`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setIsLoading(false)
    }
  }

  const applySuggestion = (s: string) => {
    setWorkspaceSlug(s)
    setSlugTouched(true)
    setError(null)
  }

  return (
    <div className="animate-in fade-in-50 duration-300">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-black text-[#111111]">
          <Sparkles className="h-3.5 w-3.5" />
          14-day free trial · Isolated agency workspace
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#111111]">
          Create your agency workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Set up a dedicated, secure environment for your practice. No credit card
          required.
        </p>
      </div>

      <form onSubmit={handleSignupSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <Label htmlFor="first-name" className="font-bold text-slate-700">
              First name
            </Label>
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
            <Label htmlFor="last-name" className="font-bold text-slate-700">
              Last name
            </Label>
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

        <label className="grid gap-2">
          <Label htmlFor="agency" className="font-bold text-slate-700">
            Agency name
          </Label>
          <Input
            id="agency"
            required
            placeholder="e.g. AVC Migration Pty Ltd"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </label>

        <div className="grid gap-2">
          <Label htmlFor="workspace-slug" className="font-bold text-slate-700">
            Workspace URL
          </Label>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#111111]/30">
            <span className="flex items-center gap-1.5 border-r border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {appHost}/workspace/
            </span>
            <Input
              id="workspace-slug"
              required
              value={workspaceSlug}
              onChange={(e) => {
                setSlugTouched(true)
                setWorkspaceSlug(normalizeWorkspaceSlug(e.target.value))
                setError(null)
              }}
              placeholder="your-agency"
              className="h-11 border-0 shadow-none focus-visible:ring-0"
              aria-describedby="workspace-slug-hint"
            />
            <span className="flex w-10 items-center justify-center border-l border-slate-100">
              {slugCheck === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
              {slugCheck === "available" && (
                <CheckCircle2 className="h-4 w-4 text-[#5C5C5C]" aria-hidden />
              )}
              {(slugCheck === "taken" || slugCheck === "invalid") && (
                <XCircle className="h-4 w-4 text-red-500" aria-hidden />
              )}
            </span>
          </div>
          <p id="workspace-slug-hint" className="text-xs text-slate-500">
            {slugCheck === "available" && (
              <span className="font-semibold text-[#111111]">
                This URL is available.
              </span>
            )}
            {slugCheck === "taken" && (
              <span className="font-semibold text-red-600">
                This URL is already in use. Pick a suggestion below or edit the URL.
              </span>
            )}
            {slugCheck === "invalid" && slugValidation.valid === false && (
              <span className="font-semibold text-red-600">{slugValidation.error}</span>
            )}
            {(slugCheck === "idle" || slugCheck === "checking") && slugValidation.valid && (
              <span>
                Letters, numbers, and hyphens only. This is your permanent workspace
                address for clients and staff.
              </span>
            )}
          </p>
          {slugSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slugSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="rounded-lg border border-[#E7E7E7] bg-[#FAFAFA] px-3 py-1.5 text-xs font-bold text-[#222222] hover:bg-[#FAFAFA]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="grid gap-2">
          <Label htmlFor="marn" className="font-bold text-slate-700">
            Principal MARN (7-digit)
          </Label>
          <Input
            id="marn"
            required
            placeholder="e.g. 1794016"
            value={marn}
            onChange={(e) => setMarn(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </label>

        <label className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">
            Work email
          </Label>
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
            <span className="text-xs font-bold text-slate-500">Agency size</span>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            >
              <option value="1">Solo RMA</option>
              <option value="2-5">2–5 practitioners</option>
              <option value="6-15">6–15 practitioners</option>
              <option value="15+">15+ enterprise</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold text-slate-500">
              Primary specialisation
            </span>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            >
              <option value="skilled">Skilled SC 189/190</option>
              <option value="partner">Partner SC 820/309</option>
              <option value="parent">Parent SC 143</option>
              <option value="employer">Employer sponsored SC 482</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <Label htmlFor="password" className="font-bold text-slate-700">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="Min. 8 characters, mixed case & number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="group mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#111111] text-base font-black shadow-sm hover:bg-[#222222] disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Create workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 grid gap-2.5 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] p-4 text-xs font-bold text-slate-700">
        {[
          "Dedicated workspace URL for your agency",
          "Client agreements and document signing in one place",
          "Team invites and role-based access",
        ].map((benefit) => (
          <div key={benefit} className="flex items-center gap-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#111111]" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-[#111111] hover:underline">
          Sign in
        </Link>
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignup}
        disabled={isLoading}
        className="mt-3 h-11 w-full rounded-xl border-slate-200 bg-white"
      >
        Continue with Google
      </Button>
    </div>
  )
}

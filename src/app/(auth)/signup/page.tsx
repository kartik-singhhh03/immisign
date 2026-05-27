import Link from "next/link"
import { CheckCircle2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  return (
    <div className="animate-in fade-in-50">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C]">
          <Sparkles className="h-3.5 w-3.5" />
          14-day free trial
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#081B2E]">
          Create your agency workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Set up ImmiSign for your practice. No credit card required.
        </p>
      </div>

      <form className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first-name" label="First name" placeholder="Jane" />
          <Field id="last-name" label="Last name" placeholder="Doe" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="agency" label="Agency name" placeholder="MARA Migration Practice" />
          <Field id="marn" label="MARN Number (7-digit)" placeholder="e.g. 1794016" />
        </div>
        
        <Field id="email" label="Work email" placeholder="jane@agency.com.au" type="email" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Agency Size</span>
            <select className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <option value="1">Solo RMA</option>
              <option value="2-5">2-5 Practitioners</option>
              <option value="6-15">6-15 Practitioners</option>
              <option value="15+">15+ Enterprise</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Primary Matter Specialisation</span>
            <select className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <option value="skilled">Skilled SC 189/190</option>
              <option value="partner">Partner SC 820/309</option>
              <option value="parent">Parent SC 143</option>
              <option value="employer">Employer Sponsored SC 482</option>
            </select>
          </label>
        </div>

        <Field id="password" label="Password" placeholder="Create a strong password" type="password" />
        <Button className="h-12 rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52]">
          Start free trial
        </Button>
      </form>

      <div className="mt-6 grid gap-3 rounded-xl border border-emerald-100 bg-[#F7FAF8] p-5">
        {["MARA-ready agreement templates", "Document library included", "Team-ready onboarding"].map((benefit) => (
          <div key={benefit} className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-[#0D9F8C]" />
            {benefit}
          </div>
        ))}
      </div>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-[#0D9F8C]">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  placeholder,
  type = "text",
}: {
  id: string
  label: string
  placeholder: string
  type?: string
}) {
  return (
    <label className="grid gap-2">
      <Label htmlFor={id} className="font-bold text-slate-700">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        className="h-12 rounded-xl border-slate-200 bg-white"
      />
    </label>
  )
}

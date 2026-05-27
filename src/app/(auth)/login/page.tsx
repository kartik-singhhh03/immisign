import Link from "next/link"
import { LockKeyhole, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <div className="animate-in fade-in-50">
      <div className="mb-8">
        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C]">
          Secure practitioner login
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#081B2E]">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in to manage agreements, documents and client workflows.
        </p>
      </div>

      <form className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@agency.com.au"
            className="h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-bold text-slate-700">
              Password
            </Label>
            <Link href="/forgot-password" className="text-sm font-bold text-[#0D9F8C]">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F7FAF8] p-4">
          <label htmlFor="remember" className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <Checkbox id="remember" />
            Remember me for 30 days
          </label>
          <LockKeyhole className="h-4 w-4 text-[#0D9F8C]" />
        </div>
        <Button className="h-12 rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52]">
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-slate-700">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0D9F8C]" />
        <p>
          Protected with secure session controls and audit-ready access logs for
          professional teams.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        New to ImmiSign?{" "}
        <Link href="/signup" className="font-black text-[#0D9F8C]">
          Start a free trial
        </Link>
      </p>
    </div>
  )
}

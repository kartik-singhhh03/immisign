import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  return (
    <div className="animate-in fade-in-50">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#0D9F8C]">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
      <div className="mt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-[#081B2E]">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your work email and we will send a secure recovery link.
        </p>
      </div>
      <form className="mt-8 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-bold text-slate-700">
            Work email
          </Label>
          <Input id="email" type="email" placeholder="name@agency.com.au" className="h-12 rounded-xl border-slate-200 bg-white" />
        </div>
        <Button className="h-12 rounded-xl bg-[#0D9F8C] text-base font-black hover:bg-[#0A5B52]">
          Send recovery link
        </Button>
      </form>
    </div>
  )
}

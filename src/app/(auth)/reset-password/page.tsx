import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col space-y-8 animate-in fade-in-50">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Set new password</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Please enter your new password below.
        </p>
      </div>

      <div className="grid gap-6">
        <form>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 px-4 shadow-subtle border-gray-200 focus-visible:ring-[#0D9F8C] transition-shadow text-base placeholder:text-gray-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password" className="text-gray-700 font-semibold">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 px-4 shadow-subtle border-gray-200 focus-visible:ring-[#0D9F8C] transition-shadow text-base placeholder:text-gray-400"
              />
            </div>
            <Button className="w-full h-12 mt-2 bg-[#0D9F8C] text-white hover:bg-[#0A3D36] text-base font-bold shadow-elevated rounded-xl border-0 transition-colors">
              Reset password
            </Button>
          </div>
        </form>
      </div>

      <p className="px-8 text-center text-sm text-gray-500 font-medium">
        Back to{" "}
        <Link href="/login" className="text-[#0D9F8C] font-semibold hover:text-[#0A3D36] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

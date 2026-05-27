import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6 text-center text-[#081B2E]">
      <div className="max-w-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#0D9F8C] shadow-sm">
          <Compass className="h-8 w-8" />
        </div>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.18em] text-[#0D9F8C]">
          404
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">
          This page is not on the map.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          The route may have moved, or the resource you are looking for is no longer available.
        </p>
        <Button asChild className="mt-8 h-12 rounded-lg bg-[#0D9F8C] px-8 font-bold hover:bg-[#0A5B52]">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { AlertCircle, ArrowLeft, Home } from "lucide-react"

export default function WorkspaceNotFound() {
  const { slug } = useRequireWorkspace()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-inner border border-slate-200/60 transition-transform hover:scale-105 duration-300">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-3xl font-black tracking-tight text-[#081B2E]">Page not found</h2>
      <p className="mt-3 max-w-md text-sm text-slate-500 font-medium">
        We couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#081B2E] shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400 gap-2" />
          Go Back
        </button>
        {slug && (
          <Link
            href={`/workspace/${slug}/dashboard`}
            className="flex items-center gap-2 rounded-xl bg-[#0D9F8C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0A8777] shadow-[0_4px_12px_rgba(13,159,140,0.2)] hover:shadow-[0_4px_16px_rgba(13,159,140,0.3)]"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}

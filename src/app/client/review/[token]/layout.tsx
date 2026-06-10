import { Metadata } from "next"
import { APP_NAME } from "@/lib/brand"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: `Application Review | ${APP_NAME}`,
  description: "Secure client verification and lodgement approval.",
}

export default function ClientReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 select-none">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-center border-b border-slate-200 bg-white shadow-sm">
        <div className="text-lg font-black tracking-tighter text-[#081B2E]">
          {APP_NAME}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

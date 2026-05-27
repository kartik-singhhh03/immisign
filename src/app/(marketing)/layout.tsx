"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ChevronDown, Globe2, Mail, Send, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageTransition } from "@/components/layout/page-transition"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    // Initial check
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 ease-in-out border-b",
          isScrolled 
            ? "border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-[0_2px_15px_rgba(8,27,46,0.01),0_8px_32px_rgba(8,27,46,0.02)] py-3.5" 
            : "border-transparent bg-transparent py-5"
        )}
      >
        <div className="container mx-auto flex max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 text-[#081a36] transition-transform duration-300 hover:scale-[1.01]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#33C48D] to-[#0D9F8C] text-white shadow-[0_8px_20px_rgba(13,159,140,0.18)]">
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-[#081b36]">
                immi<span className="text-[#0D9F8C]">Sign</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-8 lg:flex">
              <Link
                href="/features"
                className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 transition-colors duration-200 hover:text-[#0D9F8C]"
              >
                Features <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Link>
              <Link
                href="/for-migration-agents"
                className="text-sm font-bold text-slate-800 transition-colors duration-200 hover:text-[#0D9F8C]"
              >
                For Migration Agents
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-bold text-slate-800 transition-colors duration-200 hover:text-[#0D9F8C]"
              >
                Pricing
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 transition-colors duration-200 hover:text-[#0D9F8C]"
              >
                Resources <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Link>
              <Link
                href="/about"
                className="text-sm font-bold text-slate-800 transition-colors duration-200 hover:text-[#0D9F8C]"
              >
                About Us
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-bold text-slate-900 transition-colors duration-200 hover:text-[#0D9F8C] sm:block"
            >
              Log in
            </Link>
            <Button className="h-10 rounded-xl bg-[#0D9F8C] px-6 font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] transition-all duration-300 hover:bg-[#0A5B52] hover:shadow-[0_14px_30px_rgba(13,159,140,0.28)] hover:-translate-y-0.5">
              Start 14-Day Free Trial
              <span className="hidden sm:inline ml-1">→</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="bg-gradient-to-b from-[#02100d] to-[#000504] text-white border-t border-emerald-900/10">
        <div className="container mx-auto max-w-[1400px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1.1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2 text-white transition-transform duration-300 hover:scale-[1.01]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#33C48D] to-[#0D9F8C] text-white shadow-sm">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <span className="text-2xl font-black tracking-tight">
                  immi<span className="text-[#33C48D]">Sign</span>
                </span>
              </Link>
              <p className="mt-5 max-w-xs text-sm leading-7 text-emerald-100/60 font-medium">
                The only e-signature and document platform built exclusively for
                Australian migration agents.
              </p>
              <div className="mt-6 flex gap-3">
                {[Globe2, ShieldCheck, Send].map((Icon, index) => (
                  <span
                    key={index}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white border border-white/[0.04] hover:bg-[#0D9F8C] hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>

            <FooterColumn
              title="Product"
              links={["Features", "Document Library", "Pricing", "Changelog"]}
            />
            <FooterColumn
              title="Resources"
              links={["Help Centre", "Templates", "Blog", "Guides"]}
            />
            <FooterColumn
              title="Company"
              links={["About Us", "Contact Us", "Privacy Policy", "Terms of Service"]}
            />

            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-100/90">Stay updated</h3>
              <p className="mt-4 text-xs leading-5 text-emerald-100/50 font-medium">
                Tips, updates and resources for migration professionals.
              </p>
              <div className="mt-5 flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 shadow-sm focus-within:border-[#0D9F8C]/40 transition-colors">
                <input
                  aria-label="Email address"
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-emerald-100/30"
                />
                <button
                  aria-label="Subscribe"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#33C48D] to-[#0D9F8C] text-white shadow-sm transition-all duration-300 hover:brightness-110"
                >
                  <Mail className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-emerald-100/40 font-medium md:flex-row">
            <p>© 2026 ImmiSign. All rights reserved.</p>
            <p>Built by migration professionals, for migration professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-100/90">{title}</h3>
      <div className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link}
            href="#"
            className="text-sm text-emerald-100/60 font-medium transition-colors duration-200 hover:text-white"
          >
            {link}
          </Link>
        ))}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, Globe2, Mail, Menu, Send, ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageTransition } from "@/components/layout/page-transition"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { name: "Features", href: "/features" },
    { name: "For Migration Agents", href: "/for-migration-agents" },
    { name: "Pricing", href: "/pricing" },
    { name: "Resources", href: "/resources" },
    { name: "About Us", href: "/about" },
    { name: "Security", href: "/security" },
    { name: "Contact", href: "/contact" },
  ]

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#081B2E] antialiased">
      {/* Premium Translucent Header */}
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 ease-in-out border-b",
          isScrolled 
            ? "border-slate-200/50 bg-white/75 backdrop-blur-xl shadow-[0_2px_15px_rgba(8,27,46,0.01),0_8px_32px_rgba(8,27,46,0.02)] py-3" 
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
            
            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-8 lg:flex">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-bold transition-all duration-200 hover:text-[#0D9F8C] relative py-1",
                      active ? "text-[#0D9F8C]" : "text-slate-800"
                    )}
                  >
                    {link.name}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#33C48D] to-[#0D9F8C] shadow-[0_1px_4px_rgba(13,159,140,0.4)]" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className={cn(
                "hidden text-sm font-bold transition-colors duration-200 hover:text-[#0D9F8C] sm:block",
                pathname === "/login" ? "text-[#0D9F8C]" : "text-slate-900"
              )}
            >
              Log in
            </Link>
            <Button asChild className="h-10 rounded-xl bg-[#0D9F8C] px-6 font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] transition-all duration-300 hover:bg-[#0A5B52] hover:shadow-[0_14px_30px_rgba(13,159,140,0.28)] hover:-translate-y-0.5">
              <Link href="/signup">
                Start 14-Day Free Trial
                <span className="hidden sm:inline ml-1">→</span>
              </Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#081B2E] shadow-sm hover:bg-slate-50 transition-colors lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl py-6 px-6 shadow-xl transition-all duration-300 lg:hidden animate-enter">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-base font-bold py-2 border-b border-slate-50 last:border-0 transition-colors",
                      active ? "text-[#0D9F8C] pl-2 border-l-2 border-l-[#0D9F8C]" : "text-slate-800"
                    )}
                  >
                    {link.name}
                  </Link>
                )
              })}
              <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-[#081B2E] hover:bg-slate-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl bg-[#0D9F8C] text-sm font-bold text-white shadow-sm hover:bg-[#0A5B52] transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Premium Dark Footer */}
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
                Australian migration agents and OMARA-registered practitioners.
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
              links={["Features", "Document Library", "Pricing", "Security"]}
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
                OMARA updates, compliance changes and digital automation news.
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
            <p>Designed and hosted on-shore in Sydney, Australia.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  const getHref = (name: string) => {
    switch (name) {
      case "Features": return "/features"
      case "Document Library": return "/documents/library"
      case "Pricing": return "/pricing"
      case "Security": return "/security"
      case "About Us": return "/about"
      case "Contact Us": return "/contact"
      case "Privacy Policy": return "/privacy"
      case "Terms of Service": return "/terms"
      case "Help Centre":
      case "Templates":
      case "Blog":
      case "Guides":
        return "/resources"
      default: return "#"
    }
  }

  return (
    <div>
      <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-100/90">{title}</h3>
      <div className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link}
            href={getHref(link)}
            className="text-sm text-emerald-100/60 font-medium transition-colors duration-200 hover:text-white"
          >
            {link}
          </Link>
        ))}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { MarketingMobileNav, MarketingNav } from "@/components/marketing/MarketingNav"
import { cn } from "@/lib/utils"
import { APP_TAGLINE } from "@/lib/brand"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F9F9] font-sans text-mate-primary antialiased">
      <header
        className={cn(
          "z-50 w-full transition-colors duration-300",
          isHome
            ? "absolute left-0 right-0 top-0 h-[88px] border-0 bg-transparent"
            : "sticky top-0 border-b border-white/10 bg-[#0A0A0A]",
        )}
      >
        <div className="container mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6">
          <Logo
            href="/"
            priority
            variant="light"
            useImage
            clipTagline
            width={220}
            imageClassName="h-[3.25rem] w-[220px] max-w-none sm:h-[3.5rem] sm:w-[240px]"
          />

          <MarketingNav />

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden text-[13px] font-medium text-white/60 transition-colors hover:text-white sm:block"
            >
              Login
            </Link>
            <Link
              href="/contact"
              className="nav-demo-btn hidden h-12 items-center justify-center gap-1.5 rounded-[14px] bg-white px-5 text-[13px] font-semibold text-[#0A0A0A] shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] sm:inline-flex"
            >
              Book a Demo
              <span className="text-[#0A0A0A]/60">→</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center text-white xl:hidden"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            className={cn(
              "border-t border-white/10 px-6 py-6 xl:hidden",
              isHome ? "bg-[#0A0A0A]/95 backdrop-blur-md" : "bg-[#0A0A0A]",
            )}
          >
            <div className="flex flex-col gap-4">
              <MarketingMobileNav onNavigate={() => setIsMobileMenuOpen(false)} />
              <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
                <Link href="/login" className="text-sm font-medium text-white/60">
                  Login
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-white text-sm font-semibold text-[#0A0A0A]"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-white/10 bg-[#0A0A0A] text-white">
        <div className="container mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div>
              <Logo href="/" variant="light" showTagline useImage width={140} />
              <p className="mt-6 max-w-xs text-sm leading-7 text-white/50">{APP_TAGLINE}</p>
            </div>

            <FooterColumn
              title="Product"
              links={[
                { label: "Features", href: "/features" },
                { label: "Workflow", href: "/#workflow" },
                { label: "Pricing", href: "/pricing" },
              ]}
            />
            <FooterColumn
              title="For Agents"
              links={[
                { label: "For Migration Agents", href: "/for-migration-agents" },
                { label: "Resources", href: "/resources" },
                { label: "Security", href: "/security" },
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ]}
            />
            <FooterColumn
              title="Legal"
              links={[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Cookies", href: "/cookies" },
              ]}
            />
          </div>

          <div className="mt-16 flex flex-col justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/40 md:flex-row">
            <p>© {new Date().getFullYear()} ImmiMate. All rights reserved.</p>
            <p>Sydney, Australia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {title}
      </h3>
      <div className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-white/55 transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

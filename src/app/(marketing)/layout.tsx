"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { MarketingMobileNav, MarketingNav } from "@/components/marketing/MarketingNav"
import { MarketingPageTransition } from "@/components/marketing/MarketingPageTransition"
import { MarketingScrollRestoration } from "@/components/marketing/MarketingScrollRestoration"
import { useMarketingAnchorScroll } from "@/components/marketing/useMarketingAnchorScroll"
import { cn } from "@/lib/utils"
import { APP_TAGLINE } from "@/lib/brand"
import { FOOTER_LINKS } from "@/lib/marketing-nav"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const pathname = usePathname()
  const isHome = pathname === "/"

  useMarketingAnchorScroll()

  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [pathname])

  const headerSolid = !isHome || scrolled

  return (
    <div className="flex min-h-screen flex-col bg-mate-offwhite font-sans text-mate-primary antialiased">
      <MarketingScrollRestoration />

      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 w-full transition-all duration-200",
          headerSolid
            ? "border-b border-white/10 bg-mate-primary/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
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
              className="hidden text-[13px] font-medium text-white/60 transition-colors duration-200 hover:text-white sm:block"
            >
              Login
            </Link>
            <Link
              href="/book-demo"
              className="nav-demo-btn hidden h-12 items-center justify-center gap-1.5 rounded-[14px] bg-white px-5 text-[13px] font-semibold text-mate-primary shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] sm:inline-flex"
            >
              Book a Demo
              <span className="text-mate-primary/60">→</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center text-white xl:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-white/10 bg-mate-primary/95 px-6 py-6 backdrop-blur-md xl:hidden">
            <div className="flex flex-col gap-4">
              <MarketingMobileNav onNavigate={() => setIsMobileMenuOpen(false)} />
              <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
                <Link href="/login" className="text-sm font-medium text-white/60">
                  Login
                </Link>
                <Link
                  href="/book-demo"
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-white text-sm font-semibold text-mate-primary"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className={cn("flex flex-1 flex-col", !isHome && "pt-[88px]")}>
        <MarketingPageTransition>{children}</MarketingPageTransition>
      </main>

      <footer className="border-t border-white/10 bg-mate-primary text-white">
        <div className="container mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div>
              <Logo href="/" variant="light" showTagline useImage width={140} />
              <p className="mt-6 max-w-xs text-sm leading-7 text-white/50">{APP_TAGLINE}</p>
              <Link
                href="/book-demo"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-mate-primary transition-opacity hover:opacity-90"
              >
                Book a Demo
              </Link>
            </div>

            <FooterColumn title="Product" links={FOOTER_LINKS.product} />
            <FooterColumn title="Company" links={FOOTER_LINKS.company} />
            <FooterColumn title="Resources" links={FOOTER_LINKS.resources} />
            <FooterColumn title="Legal" links={FOOTER_LINKS.legal} />
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
  links: readonly { label: string; href: string }[]
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{title}</h3>
      <div className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { MARKETING_NAV_LINKS } from "@/lib/marketing-nav"

export function MarketingNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/"
    const path = href.replace("/#", "/").split("#")[0]
    if (path === "/") return false
    return pathname?.startsWith(path)
  }

  return (
    <nav className="hidden items-center gap-1 xl:flex">
      {MARKETING_NAV_LINKS.map((link) => {
        const active = isLinkActive(link.href)
        const hasDropdown = Boolean(link.dropdown?.length)

        if (!hasDropdown) {
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium tracking-wide transition-colors",
                active ? "text-white" : "text-white/60 hover:text-white",
              )}
            >
              {link.name}
            </Link>
          )
        }

        return (
          <div
            key={link.href}
            className="relative"
            onMouseEnter={() => setOpenDropdown(link.name)}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <Link
              href={link.href}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium tracking-wide transition-colors",
                active ? "text-white" : "text-white/60 hover:text-white",
              )}
            >
              {link.name}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 opacity-50 transition-transform",
                  openDropdown === link.name && "rotate-180",
                )}
                strokeWidth={2}
              />
            </Link>

            {openDropdown === link.name && (
              <div className="absolute left-0 top-full z-50 w-64 pt-2">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414] py-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                  {link.dropdown!.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className="block px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <span className="block text-sm font-medium text-white">{item.label}</span>
                      {item.description && (
                        <span className="mt-0.5 block text-xs text-white/45">
                          {item.description}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function MarketingMobileNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-1">
      {MARKETING_NAV_LINKS.map((link) => (
        <div key={link.href}>
          <Link
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "block py-2 text-base font-medium transition-colors",
              pathname?.startsWith(link.href.replace("/#", "/").split("#")[0]) &&
                link.href !== "/#workflow"
                ? "text-white"
                : "text-white/80 hover:text-white",
            )}
          >
            {link.name}
          </Link>
          {link.dropdown && (
            <div className="mb-3 ml-4 flex flex-col gap-2 border-l border-white/10 pl-4">
              {link.dropdown.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="text-sm text-white/55 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ButtonBaseProps = {
  href: string
  children: React.ReactNode
  className?: string
  showArrow?: boolean
}

export function PrimaryMarketingButton({
  href,
  children,
  className,
  showArrow = true,
}: ButtonBaseProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 min-w-[168px] items-center justify-center gap-2 rounded-lg",
        "bg-white px-7 text-[15px] font-semibold tracking-[-0.02em] text-mate-primary",
        "shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
      {showArrow && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      )}
    </Link>
  )
}

export function SecondaryMarketingButton({
  href,
  children,
  className,
  variant = "dark",
}: ButtonBaseProps & { variant?: "dark" | "light" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 items-center gap-2 rounded-lg px-2",
        "text-[15px] font-medium tracking-[-0.01em] transition-colors duration-300",
        variant === "dark"
          ? "text-white/70 hover:text-white"
          : "text-mate-muted hover:text-mate-primary",
        className,
      )}
    >
      {children}
      <ArrowUpRight
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={1.75}
      />
    </Link>
  )
}

export function TextLinkArrow({
  href,
  children,
  className,
}: ButtonBaseProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-sm font-semibold text-mate-primary transition-colors hover:text-mate-accent",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

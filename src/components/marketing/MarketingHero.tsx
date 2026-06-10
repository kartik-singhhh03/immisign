"use client"

import Link from "next/link"
import {
  Activity,
  Check,
  ChevronDown,
  Circle,
  FileText,
  FolderOpen,
  LayoutGrid,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"

const SIDEBAR_ITEMS = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Client Details", icon: User },
  { label: "Service Agreement", icon: FileText },
  { label: "File Notes", icon: FileText },
  { label: "Preparation", icon: FolderOpen },
  { label: "Approval", icon: Check },
  { label: "Lodgement", icon: FileText },
  { label: "Statement of Service", icon: FileText },
  { label: "Documents", icon: FolderOpen },
  { label: "Activity", icon: Activity },
]

const TIMELINE = [
  { label: "Service Agreement", badge: "Signed", sub: "Signed on 12 May 2025", done: true },
  { label: "File Notes", badge: "Active", sub: "12 entries recorded", done: true },
  { label: "Application Preparation", badge: "In Progress", sub: "Documents collecting", done: true },
  { label: "Application Approval", badge: "Approved", sub: "Certificate generated", done: true },
  { label: "Lodgement", badge: "Lodged", sub: "Lodged 3 Jun 2025", done: true },
  { label: "Statement of Service", badge: "Acknowledged", sub: "Client acknowledged", done: true },
  { label: "Completion", badge: "Pending", sub: "", done: false },
]

function badgeStyle(badge: string) {
  const map: Record<string, string> = {
    Signed: "bg-[#4F8C7A]/20 text-[#6db89a]",
    Active: "bg-white/10 text-white/70",
    "In Progress": "bg-amber-500/15 text-amber-200/90",
    Approved: "bg-[#4F8C7A]/20 text-[#6db89a]",
    Lodged: "bg-white/10 text-white/75",
    Acknowledged: "bg-[#4F8C7A]/15 text-[#6db89a]",
    Pending: "bg-white/5 text-white/40",
  }
  return map[badge] ?? "bg-white/10 text-white/60"
}

function HeroDashboardMockup() {
  return (
    <div className="hero-dashboard-scene relative mx-auto w-full max-w-[580px] scale-[0.92] lg:max-w-none lg:scale-100">
      {/* Soft spotlight behind dashboard */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-[100px]"
        aria-hidden
      />

      {/* Floor light */}
      <div
        className="pointer-events-none absolute bottom-[8%] left-1/2 h-[80px] w-[70%] -translate-x-1/2 rounded-[100%] bg-white/[0.12] blur-[48px]"
        aria-hidden
      />

      {/* Reflection */}
      <div
        className="hero-dashboard-reflection pointer-events-none absolute -bottom-8 left-1/2 h-16 w-[78%] -translate-x-1/2 opacity-[0.06]"
        aria-hidden
      />

      <div className="hero-dashboard-float relative [perspective:1400px]">
        <div
          className={cn(
            "hero-dashboard-tilt overflow-hidden rounded-[28px]",
            "border border-white/[0.08] bg-[rgba(20,20,20,0.9)] backdrop-blur-xl",
            "shadow-[0_10px_30px_rgba(0,0,0,0.25),0_30px_80px_rgba(0,0,0,0.4),0_60px_120px_rgba(0,0,0,0.45)]",
          )}
        >
          <div className="flex min-h-[300px] md:min-h-[340px]">
            {/* Sidebar */}
            <aside className="hidden w-[200px] shrink-0 flex-col border-r border-white/[0.06] bg-[#141414]/80 py-5 sm:flex">
              <div className="px-4 pb-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F8C7A]/25 text-[11px] font-bold text-[#6db89a]">
                  im
                </span>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 px-2">
                {SIDEBAR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] font-medium",
                      item.active
                        ? "bg-[#4F8C7A]/20 text-[#8ecfb5]"
                        : "text-white/45",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </nav>
              <div className="mt-auto border-t border-white/[0.06] px-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4F8C7A]/30 text-[9px] font-bold text-white">
                    AV
                  </span>
                  <span className="text-[10px] font-medium text-white/55">AVC Migration</span>
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Client Overview
                  </p>
                  <h3 className="mt-2 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.02em] text-white md:text-[1.85rem]">
                    Sarah Johnson
                  </h3>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                    Student Visa — Subclass 500 — Independent Visa
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium text-white/55"
                >
                  View Full Timeline
                </button>
              </div>

              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Matter Progress
              </p>

              <div className="mt-4 flex-1 space-y-0">
                {TIMELINE.map((step, i) => (
                  <div
                    key={step.label}
                    className={cn(
                      "flex items-center gap-3 py-1.5",
                      i < TIMELINE.length - 1 && "border-b border-white/[0.04]",
                    )}
                  >
                    <div className="flex w-5 shrink-0 justify-center">
                      {step.done ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4F8C7A]/25">
                          <Check className="h-2.5 w-2.5 text-[#6db89a]" strokeWidth={3} />
                        </span>
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-white/25" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-white/85">{step.label}</p>
                      {step.sub && (
                        <p className="text-[10px] text-white/35">{step.sub}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-semibold",
                        badgeStyle(step.badge),
                      )}
                    >
                      {step.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MarketingHero() {
  return (
    <section className="relative h-screen max-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Layered background */}
      <div className="pointer-events-none absolute inset-0 bg-[#0A0A0A]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[#111111]/40" aria-hidden />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.55)]"
        aria-hidden
      />

      <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-6 pb-6 pt-[88px]">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 xl:gap-12">
          {/* Left */}
          <div className="max-w-[520px]">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-mate-accent" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-mate-accent">
                For registered migration agents
              </p>
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.75rem,5.2vw,5.75rem)] font-semibold leading-[0.9] text-white">
              <span className="block">Everything</span>
              <span className="block text-mate-accent">
                Connected
              </span>
              <span className="block">To The Client.</span>
            </h1>

            <div className="mt-6 max-w-[520px] text-[17px] leading-[1.6] text-[#C8C8C8] md:text-[18px]">
              <p>
                Service Agreements. File Notes. Application Approvals. Statements of Service.
              </p>
              <p className="mt-2 text-[15px] text-[#C8C8C8]/85 md:text-[17px]">
                Built to help migration practices remain audit-ready.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/book-demo"
                className="hero-primary-cta inline-flex h-12 w-[168px] items-center justify-center rounded-2xl bg-white text-[14px] font-semibold text-mate-primary shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
              >
                Book a Demo
              </Link>
              <Link
                href="/workflow"
                className="hero-secondary-cta group inline-flex items-center gap-2 text-[15px] font-medium text-white/80 transition-colors hover:text-white"
              >
                Watch Workflow
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Right */}
          <HeroDashboardMockup />
        </div>
      </div>
    </section>
  )
}

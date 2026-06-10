"use client"

import Link from "next/link"
import { motion, useInView } from "framer-motion"
import * as React from "react"
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Shield,
  Users,
  UserCheck,
  ScrollText,
} from "lucide-react"

import { PrimaryMarketingButton } from "@/components/marketing/MarketingButtons"
import { FEATURE_CARDS, TESTIMONIALS, TRUSTED_AGENCIES } from "@/lib/marketing/content"

const FEATURE_ICONS = [
  Users,
  ClipboardCheck,
  Shield,
  FileText,
  FolderOpen,
  BarChart3,
  UserCheck,
  ScrollText,
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">
      {children}
    </p>
  )
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    const duration = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setCount(Math.floor(value * p))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export function TrustedBySection() {
  return (
    <section className="border-b border-mate-border bg-white py-14 md:py-16">
      <div className="container mx-auto max-w-[1400px] px-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-muted">
          Trusted by migration practices across Australia
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUSTED_AGENCIES.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-mate-primary/70 transition-colors hover:text-mate-primary"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeatureGridSection() {
  return (
    <section className="bg-[#F9F9F9] py-24 md:py-32">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="text-center">
          <SectionLabel>Platform capabilities</SectionLabel>
          <h2 className="mt-4 font-display text-[2.25rem] font-normal tracking-[-0.03em] text-mate-primary md:text-[3rem]">
            Everything your practice needs.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_CARDS.map((card, i) => {
            const Icon = FEATURE_ICONS[i] ?? FileText
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group rounded-2xl border border-mate-border bg-white p-6 shadow-[0_8px_30px_rgba(17,17,17,0.04)] transition-shadow hover:shadow-[0_16px_40px_rgba(17,17,17,0.08)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mate-accent/10 text-mate-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold text-mate-primary">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mate-muted">{card.desc}</p>
              </motion.div>
            )
          })}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/features"
            className="text-sm font-semibold text-mate-accent underline decoration-mate-accent/30 underline-offset-4 hover:decoration-mate-accent"
          >
            Explore all features →
          </Link>
        </div>
      </div>
    </section>
  )
}

export function MetricsSection() {
  const metrics = [
    { label: "Platform uptime", value: 99.9, suffix: "%" },
    { label: "Documents processed", value: 50000, suffix: "+" },
    { label: "Approvals tracked", value: 12000, suffix: "+" },
    { label: "Audit events logged", value: 250000, suffix: "+" },
  ]

  return (
    <section className="border-y border-mate-border bg-mate-primary py-20 text-white md:py-24">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center lg:text-left">
              <p className="font-display text-4xl font-normal tracking-tight md:text-5xl">
                <AnimatedCounter value={m.value} suffix={m.suffix} />
              </p>
              <p className="mt-2 text-sm text-white/55">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="text-center">
          <SectionLabel>Testimonials</SectionLabel>
          <h2 className="mt-4 font-display text-[2.25rem] font-normal tracking-[-0.03em] text-mate-primary md:text-[3rem]">
            Built with agents, for agents.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="flex flex-col rounded-2xl border border-mate-border bg-mate-offwhite p-8"
            >
              <p className="flex-1 text-[15px] leading-relaxed text-mate-secondary">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-6 border-t border-mate-border pt-5">
                <p className="text-sm font-semibold text-mate-primary">{t.name}</p>
                <p className="text-xs text-mate-muted">
                  {t.role} · {t.agency}
                </p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeFinalCta() {
  return (
    <section className="bg-[#F9F9F9] px-6 py-16 md:py-24">
      <div className="container mx-auto max-w-[1400px]">
        <div className="flex flex-col items-start justify-between gap-10 rounded-[2rem] bg-mate-secondary px-8 py-12 text-white md:flex-row md:items-center md:px-14 md:py-14">
          <div className="max-w-lg">
            <h2 className="font-display text-[2rem] font-normal leading-[1.1] tracking-[-0.03em] md:text-[2.5rem]">
              Experience ImmiMate for your practice.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Book a personalised demo and see how ImmiMate connects every compliance workflow to the client.
            </p>
          </div>
          <PrimaryMarketingButton href="/book-demo">Book a Demo</PrimaryMarketingButton>
        </div>
      </div>
    </section>
  )
}

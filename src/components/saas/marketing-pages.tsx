"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  Info,
  LockKeyhole,
  MessageSquare,
  Scale,
  Search,
  ShieldCheck,
  Users,
  Workflow,
  FileText,
} from "lucide-react"

import { ComplianceStatsBar } from "@/components/marketing/ComplianceStatsBar"
import {
  PrimaryMarketingButton,
  SecondaryMarketingButton,
} from "@/components/marketing/MarketingButtons"
import { WorkflowTimeline } from "@/components/marketing/WorkflowTimeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { APP_POSITIONING, APP_TAGLINE } from "@/lib/brand"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">
      {children}
    </p>
  )
}

function EditorialHeadline({
  lines,
  className = "",
}: {
  lines: React.ReactNode[]
  className?: string
}) {
  return (
    <h2
      className={`font-display text-[2.35rem] font-normal leading-[1.12] tracking-[-0.03em] text-mate-primary md:text-5xl lg:text-[3.25rem] ${className}`}
    >
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </h2>
  )
}

function PageHero({
  eyebrow,
  headline,
  subhead,
  children,
}: {
  eyebrow?: string
  headline: React.ReactNode
  subhead: string
  children?: React.ReactNode
}) {
  return (
    <section className="border-b border-mate-border bg-white pt-32 pb-20 md:pt-36 md:pb-24">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="max-w-3xl">
          {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
          <h1 className="mt-6 font-display text-[2.75rem] font-normal leading-[1.08] tracking-[-0.035em] text-mate-primary md:text-6xl lg:text-[4rem]">
            {headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mate-muted">{subhead}</p>
          {children && <div className="mt-10">{children}</div>}
        </div>
      </div>
    </section>
  )
}

function SectionHeader({
  eyebrow,
  title,
  text,
  align = "center",
}: {
  eyebrow?: string
  title: string
  text?: string
  align?: "center" | "left"
}) {
  return (
    <div
      className={`mb-16 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
      <h2 className="mt-4 font-display text-3xl font-normal leading-tight tracking-[-0.03em] text-mate-primary md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && (
        <p className="mt-4 text-base font-normal leading-7 text-mate-muted">{text}</p>
      )}
    </div>
  )
}

function CTA() {
  return (
    <section className="bg-[#F9F9F9] px-6 pb-24 md:pb-32">
      <div className="container mx-auto max-w-[1400px]">
        <div className="flex flex-col items-start justify-between gap-10 rounded-[2rem] bg-[#1a1a1a] px-8 py-12 text-white md:flex-row md:items-center md:px-14 md:py-14">
          <div className="max-w-lg">
            <h2 className="font-display text-[2rem] font-normal leading-[1.1] tracking-[-0.03em] md:text-[2.5rem]">
              Ready for audit-ready compliance?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              See how ImmiMate connects every workflow to the client.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <PrimaryMarketingButton href="/contact">Book a Demo</PrimaryMarketingButton>
            <SecondaryMarketingButton href="/pricing" variant="dark">
              View Pricing
            </SecondaryMarketingButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function CapabilityRow({
  id,
  label,
  title,
  description,
  points,
}: {
  id?: string
  label: string
  title: string
  description: string
  points: string[]
}) {
  return (
    <div
      id={id}
      className="scroll-mt-28 grid gap-10 border-b border-mate-border py-14 last:border-b-0 md:grid-cols-[0.35fr_0.65fr]"
    >
      <div>
        <SectionLabel>{label}</SectionLabel>
        <h3 className="mt-3 font-display text-2xl font-normal tracking-[-0.02em] text-mate-primary md:text-3xl">
          {title}
        </h3>
      </div>
      <div>
        <p className="text-base leading-7 text-mate-muted">{description}</p>
        <ul className="mt-6 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-mate-secondary">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-mate-accent" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TimelineStep({
  index,
  title,
  description,
  isLast = false,
}: {
  index: number
  title: string
  description: string
  isLast?: boolean
}) {
  return (
    <div className="relative flex gap-6 pb-10 last:pb-0">
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-mate-border" />
      )}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center border border-mate-border bg-white">
        <span className="text-[10px] font-semibold text-mate-muted">{index}</span>
      </div>
      <div className="pt-0.5">
        <h4 className="text-base font-medium text-mate-primary">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-mate-muted">{description}</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// 1. FEATURES PAGE
// ----------------------------------------------------
export function FeaturesPage() {
  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow={APP_POSITIONING}
        headline={
          <>
            <span className="block">Compliance capabilities</span>
            <span className="block italic text-mate-secondary">built for your practice.</span>
          </>
        }
        subhead="Service Agreements, File Notes, Application Approvals, and Statements of Service — connected to every client record. Not document signing software. A compliance operating system."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <PrimaryMarketingButton href="/contact" className="bg-mate-primary text-white hover:bg-mate-charcoal">
            Book a Demo
          </PrimaryMarketingButton>
          <SecondaryMarketingButton href="/pricing" variant="light">
            View Pricing
          </SecondaryMarketingButton>
        </div>
      </PageHero>

      <section className="border-b border-mate-border bg-[#F9F9F9] py-20 md:py-28">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="text-center">
            <SectionLabel>The ImmiMate workflow</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-normal tracking-[-0.03em] text-mate-primary md:text-4xl lg:text-5xl">
              A complete compliance journey.
            </h2>
          </div>
          <WorkflowTimeline />
        </div>
      </section>

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <SectionHeader
            align="left"
            eyebrow="Platform capabilities"
            title="Every compliance step, in one client-centric workspace."
            text="Designed for migration practices that need audit-ready records — not another generic e-sign tool."
          />
          <CapabilityRow
            id="service-agreements"
            label="Service Agreements"
            title="OMARA-ready retainers"
            description="Standardised service agreement structures with itemised fees, disbursements, and refund terms — locked to your agency templates."
            points={[
              "Subclass-aware matter configuration",
              "Milestone payment schedules",
              "Signed agreements stored against the client",
            ]}
          />
          <CapabilityRow
            id="file-notes"
            label="File Notes"
            title="Append-only audit trail"
            description="Every client interaction recorded with server timestamps and agent identification. Exportable for compliance review."
            points={[
              "Append-only — never editable, never deletable",
              "Server timestamped and agent identified",
              "Organised by client and note type",
            ]}
          />
          <CapabilityRow
            id="application-approval"
            label="Application Approval"
            title="Review, sign, certify"
            description="Application approvals follow a compliance chain: review, client sign-off, certificate generation, permanent storage."
            points={[
              "Structured approval workflow",
              "Certificate generated on completion",
              "Stored permanently against the client",
            ]}
          />
          <CapabilityRow
            id="statement-of-service"
            label="Statement of Service"
            title="Work performed, fees confirmed"
            description="Track work performed, confirm fees, and record client acknowledgement — all linked to the client matter."
            points={[
              "Work performed documentation",
              "Fee confirmation tracking",
              "Acknowledgement status visible",
            ]}
          />
        </div>
      </section>

      <section
        id="compliance-dashboard"
        className="scroll-mt-28 border-b border-mate-border bg-[#F9F9F9] py-20 md:py-28"
      >
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="mb-12 max-w-2xl">
            <SectionLabel>Compliance Dashboard</SectionLabel>
            <EditorialHeadline
              className="mt-5"
              lines={[
                <>Know what is missing</>,
                <span className="italic text-mate-accent">before an audit does.</span>,
              ]}
            />
            <p className="mt-6 text-base leading-7 text-mate-muted">
              ImmiMate surfaces compliance gaps across your practice — missing agreements,
              pending approvals, outstanding documents, and unacknowledged statements of service.
            </p>
          </div>
          <ComplianceStatsBar />
        </div>
      </section>

      <CTA />
    </div>
  )
}

// ----------------------------------------------------
// 2. MIGRATION AGENTS PAGE
// ----------------------------------------------------
export function MigrationAgentsPage() {
  const workflowSteps = [
    { title: "Client", desc: "Every workflow begins with the client record." },
    { title: "Service Agreement", desc: "OMARA-compliant retainers with locked templates." },
    { title: "File Notes", desc: "Append-only notes with server timestamps." },
    { title: "Application Preparation", desc: "Documents and evidence organised per matter." },
    { title: "Application Approval", desc: "Review, sign, certificate, permanent storage." },
    { title: "Lodgement", desc: "Lodgement tracked against the client matter." },
    { title: "Statement of Service", desc: "Work performed, fees confirmed, acknowledged." },
    { title: "Completion", desc: "Full compliance record retained for audit." },
  ]

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="For migration agents"
        headline={
          <>
            <span className="block">Built for the pressure</span>
            <span className="block italic text-mate-secondary">of regulated practice.</span>
          </>
        }
        subhead="Managing lodgement deadlines, client anxieties, and compliance reviews is demanding enough. Your compliance infrastructure should not add to the burden."
      >
        <PrimaryMarketingButton href="/contact" className="bg-mate-primary text-white hover:bg-mate-charcoal">
          Book a Demo
        </PrimaryMarketingButton>
      </PageHero>

      <section className="border-b border-mate-border bg-[#F9F9F9] py-20 md:py-28">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="text-center">
            <SectionLabel>The ImmiMate workflow</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-normal tracking-[-0.03em] text-mate-primary md:text-4xl">
              Eight steps. One client record.
            </h2>
          </div>
          <WorkflowTimeline />
        </div>
      </section>

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel>Client-centric workflow</SectionLabel>
              <EditorialHeadline
                className="mt-5"
                lines={[
                  <>Everything connected</>,
                  <span className="italic text-mate-secondary">to the client.</span>,
                ]}
              />
              <p className="mt-6 text-base leading-7 text-mate-muted">
                {APP_TAGLINE}. One client record. Every compliance step in sequence.
              </p>
            </div>
            <div className="border border-mate-border bg-mate-offwhite p-8 md:p-10">
              {workflowSteps.map((step, i) => (
                <TimelineStep
                  key={step.title}
                  index={i + 1}
                  title={step.title}
                  description={step.desc}
                  isLast={i === workflowSteps.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-mate-border bg-mate-offwhite py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <SectionHeader
            eyebrow="The practice dilemma"
            title="Migration practices need more than generic e-signature."
            text="They require standardised legal structures, on-shore data custody, and repeatable compliance records."
          />
          <div className="space-y-0 border border-mate-border bg-white">
            {[
              {
                title: "Manual retainers slow growth",
                text: "Drafting OMARA-ready agreements for every subclass manually drains hours that could be spent advising.",
              },
              {
                title: "Generic e-sign lacks context",
                text: "Standard tools do not understand migration billing, disbursement schedules, or legal variables.",
              },
              {
                title: "Scattered compliance evidence",
                text: "Files divided across drives and emails make audit preparation stressful and disorganised.",
              },
              {
                title: "No internal access controls",
                text: "Without permissions, administrative staff can accidentally edit legal clause language before sending.",
              },
            ].map((prob, i) => (
              <div
                key={prob.title}
                className={`flex gap-6 p-8 ${i > 0 ? "border-t border-mate-border" : ""}`}
              >
                <Scale className="mt-1 h-5 w-5 shrink-0 text-mate-accent" />
                <div>
                  <h4 className="text-base font-medium text-mate-primary">{prob.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-mate-muted">{prob.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[900px] px-6">
          <SectionHeader
            eyebrow="Compliance comparison"
            title="Generic tools vs. ImmiMate"
          />
          <div className="overflow-hidden border border-mate-border">
            <div className="grid grid-cols-3 border-b border-mate-border bg-mate-grey p-5 text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
              <div>Feature</div>
              <div className="text-center">Generic E-Sign</div>
              <div className="text-center text-mate-primary">ImmiMate</div>
            </div>
            {[
              { f: "OMARA template structure", g: "Blank PDFs / manual drafts", i: "Locked subclass templates" },
              { f: "Data residency", g: "Offshore global servers", i: "Hosted on-shore in Sydney" },
              { f: "Identity verification", g: "Email link only", i: "Multi-factor verification" },
              { f: "Compliance log retention", g: "Variable retention", i: "Immutable records" },
              { f: "Workspace access", g: "Shared folders", i: "Role-based separation" },
            ].map((row) => (
              <div
                key={row.f}
                className="grid grid-cols-3 border-b border-mate-border p-5 text-sm last:border-b-0"
              >
                <div className="font-medium text-mate-primary">{row.f}</div>
                <div className="text-center text-mate-muted">{row.g}</div>
                <div className="text-center text-mate-secondary">{row.i}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

// ----------------------------------------------------
// 3. PRICING PAGE
// ----------------------------------------------------
export function PricingPage() {
  const immimatePlan = {
    name: "ImmiMate Plan",
    monthlyPrice: 49,
    seatPrice: 10,
    includedSeats: 3,
    desc: "One subscription per agency. Everything you need to run a compliant migration practice.",
    features: [
      "One agency workspace & business profile",
      "Up to 3 agents/RMAs included",
      "Unlimited agreements",
      "Application approval module",
      "File Notes audit trail",
      "Statement of Service tracking",
      "Branding & compliance visibility",
      "$10/month per additional active seat",
    ],
  }

  const comparisonRows = [
    { feature: "Agency workspace", value: "Included" },
    { feature: "Included seats (owner excluded)", value: "3" },
    { feature: "Unlimited agreements", value: "Included" },
    { feature: "Application approvals", value: "Included" },
    { feature: "File Notes", value: "Included" },
    { feature: "Additional seat", value: "$10/mo each" },
  ]

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="Pricing"
        headline={
          <>
            <span className="block">Simple pricing</span>
            <span className="block italic text-mate-secondary">for every agency.</span>
          </>
        }
        subhead={`One ImmiMate Plan per agency — $${immimatePlan.monthlyPrice}/month with ${immimatePlan.includedSeats} seats included. Add team members beyond that for $${immimatePlan.seatPrice}/month per active seat.`}
      />

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[520px] px-6">
          <div className="overflow-hidden rounded-2xl border border-mate-border bg-white shadow-[0_20px_50px_rgba(17,17,17,0.08)]">
            <div className="border-b border-mate-border bg-[#0A0A0A] px-8 py-6 text-white">
              <SectionLabel>ImmiMate Plan</SectionLabel>
              <h3 className="mt-3 font-display text-2xl font-normal">{immimatePlan.name}</h3>
              <p className="mt-2 text-sm text-white/55">{immimatePlan.desc}</p>
            </div>
            <div className="p-8 md:p-10">
              <div className="flex items-end gap-1">
                <span className="font-display text-5xl font-normal tracking-[-0.03em] text-mate-primary">
                  ${immimatePlan.monthlyPrice}
                </span>
                <span className="pb-1.5 text-sm text-mate-muted">/month</span>
              </div>
              <p className="mt-3 text-sm text-mate-muted">
                Includes {immimatePlan.includedSeats} seats · +${immimatePlan.seatPrice}/mo per
                additional active seat
              </p>

              <ul className="mt-8 space-y-4">
                {immimatePlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-mate-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mate-accent/30 bg-mate-accent/[0.08]">
                      <Check className="h-3 w-3 text-mate-accent" strokeWidth={2.5} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3">
                <PrimaryMarketingButton
                  href="/signup"
                  className="w-full justify-center bg-mate-primary text-white hover:bg-mate-charcoal"
                >
                  Get started
                </PrimaryMarketingButton>
                <SecondaryMarketingButton href="/contact" variant="light" className="justify-center">
                  Talk to sales
                </SecondaryMarketingButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-mate-border bg-mate-offwhite py-20 md:py-28">
        <div className="container mx-auto max-w-[700px] px-6">
          <SectionHeader title="What's included" />
          <div className="overflow-hidden border border-mate-border bg-white">
            <div className="grid grid-cols-2 border-b border-mate-border bg-mate-grey p-5 text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
              <div>Capability</div>
              <div className="text-center">ImmiMate Plan</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-2 border-b border-mate-border p-5 text-sm last:border-b-0"
              >
                <div className="font-medium text-mate-primary">{row.feature}</div>
                <div className="text-center text-mate-secondary">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

// ----------------------------------------------------
// 4. RESOURCES PAGE
// ----------------------------------------------------
export const RESOURCE_ITEMS = [
  {
    slug: "omara-service-agreements",
    type: "Guide",
    title: "How to structure compliant OMARA service agreements",
    category: "Compliance",
    desc: "Mandatory disclosure items, disbursements scheduling rules, and OMARA Code guidelines.",
    time: "8 min read",
  },
  {
    slug: "partner-visa-retainer-checklist",
    type: "Template",
    title: "Subclass 820 Partner Visa retainer checklist",
    category: "Templates",
    desc: "Variables structure and fee payment breakdown matching Australian guidelines.",
    time: "Download (PDF)",
  },
  {
    slug: "file-notes-workflow",
    type: "Article",
    title: "Building an audit-ready File Notes workflow",
    category: "Compliance",
    desc: "Append-only records, server timestamps, and export procedures for compliance review.",
    time: "10 min read",
  },
  {
    slug: "application-approval-chain",
    type: "Guide",
    title: "Application Approval compliance chain",
    category: "Operations",
    desc: "Review, sign, certificate generation, and permanent storage — step by step.",
    time: "6 min read",
  },
  {
    slug: "client-onboarding-email-pack",
    type: "Template",
    title: "Standard client onboarding email pack",
    category: "Templates",
    desc: "Professional templates for intake emails, review sequences, and OMARA guide links.",
    time: "Download (TXT)",
  },
  {
    slug: "statement-of-service",
    type: "Article",
    title: "Statement of Service best practices",
    category: "Operations",
    desc: "Work performed documentation, fee confirmation, and acknowledgement tracking.",
    time: "5 min read",
  },
] as const

export function ResourcesPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("All")

  const allResources = RESOURCE_ITEMS

  const filteredResources = allResources.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="Resource library"
        headline={
          <>
            <span className="block">Practical resources</span>
            <span className="block italic text-mate-secondary">for compliant practices.</span>
          </>
        }
        subhead="Guides, templates, and operating resources to help migration teams maintain audit-ready compliance."
      />

      <section className="border-b border-mate-border bg-white py-12">
        <div className="container mx-auto max-w-[1100px] px-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mate-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-none border-mate-border bg-white pl-11"
                placeholder="Search resources..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", "Compliance", "Templates", "Operations"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    selectedCategory === cat
                      ? "bg-mate-primary text-white"
                      : "border border-mate-border bg-white text-mate-muted hover:text-mate-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          {filteredResources.length === 0 ? (
            <div className="border border-dashed border-mate-border py-20 text-center">
              <Info className="mx-auto h-8 w-8 text-mate-muted" />
              <h3 className="mt-4 text-lg font-medium text-mate-primary">No resources found</h3>
              <p className="mt-1 text-sm text-mate-muted">
                Try refining your search or select another category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-mate-border border border-mate-border bg-white">
              {filteredResources.map((item) => (
                <Link
                  key={item.title}
                  href={`/blog/${item.slug}`}
                  className="group flex flex-col gap-4 p-8 transition-colors hover:bg-mate-offwhite md:flex-row md:items-center md:justify-between"
                >
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      <span>{item.type}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                    </div>
                    <h4 className="mt-2 text-base font-medium text-mate-primary group-hover:text-mate-accent">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-mate-muted">{item.desc}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm text-mate-muted">
                    <span>{item.time}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTA />
    </div>
  )
}

// ----------------------------------------------------
// 4b. BLOG PAGE
// ----------------------------------------------------
export function BlogPage() {
  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="Blog"
        headline={
          <>
            <span className="block">Insights for</span>
            <span className="block italic text-mate-accent">compliant practices.</span>
          </>
        }
        subhead="Articles, guides, and operating notes for registered migration agents building audit-ready workflows."
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <div className="divide-y divide-mate-border border border-mate-border bg-white">
            {RESOURCE_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="group flex flex-col gap-4 p-8 transition-colors hover:bg-mate-offwhite md:flex-row md:items-center md:justify-between"
              >
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                    <span>{item.type}</span>
                    <span>·</span>
                    <span>{item.category}</span>
                  </div>
                  <h4 className="mt-2 text-lg font-medium text-mate-primary group-hover:text-mate-accent">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-mate-muted">{item.desc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm text-mate-muted">
                  <span>{item.time}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

export const BLOG_POSTS: Record<
  string,
  { title: string; category: string; readTime: string; paragraphs: string[] }
> = {
  "omara-service-agreements": {
    title: "How to structure compliant OMARA service agreements",
    category: "Compliance",
    readTime: "8 min read",
    paragraphs: [
      "Service agreements are the foundation of every migration matter. Under the OMARA Code of Conduct, agents must provide clear written disclosure of services, fees, and refund terms before work begins.",
      "ImmiMate standardises agreement structures with subclass-aware variables, itemised fee schedules, and disbursement breakdowns — so every retainer meets disclosure requirements without manual drafting.",
      "Signed agreements are stored permanently against the client record, creating an audit-ready trail that links directly to File Notes, Application Approvals, and Statements of Service.",
    ],
  },
  "partner-visa-retainer-checklist": {
    title: "Subclass 820 Partner Visa retainer checklist",
    category: "Templates",
    readTime: "Template",
    paragraphs: [
      "Partner visa matters require careful fee disclosure across multiple stages — from relationship evidence preparation through to permanent residency pathways.",
      "This checklist covers the standard variables, disbursement categories, and payment milestone structures recommended for Subclass 820 retainers under Australian guidelines.",
      "Use ImmiMate agency templates to lock clause language and ensure consistent disclosure across your practice.",
    ],
  },
  "file-notes-workflow": {
    title: "Building an audit-ready File Notes workflow",
    category: "Compliance",
    readTime: "10 min read",
    paragraphs: [
      "File Notes are the backbone of compliance evidence. Every phone call, email, attendance, and piece of advice should be recorded with server timestamps and agent identification.",
      "ImmiMate File Notes are append-only — never editable, never deletable. Notes are organised by client and note type, and can be exported for audit at any time.",
      "A consistent File Notes discipline protects your practice during OMARA reviews and gives clients confidence that their matter is professionally documented.",
    ],
  },
  "application-approval-chain": {
    title: "Application Approval compliance chain",
    category: "Operations",
    readTime: "6 min read",
    paragraphs: [
      "Before lodgement, clients must review and approve their application. ImmiMate structures this as a formal compliance chain: review, client sign-off, certificate generation, and permanent storage.",
      "Each approval is linked to the client matter with a timestamped record. Certificates are generated automatically on completion and retained for audit.",
      "This replaces informal email confirmations with a defensible, repeatable process.",
    ],
  },
  "client-onboarding-email-pack": {
    title: "Standard client onboarding email pack",
    category: "Templates",
    readTime: "Template",
    paragraphs: [
      "Professional onboarding sets the tone for the client relationship. This pack includes intake emails, document request sequences, and OMARA guide references.",
      "Templates are designed to align with ImmiMate workflow stages — from Service Agreement through to Application Preparation.",
      "Consistent onboarding reduces back-and-forth and ensures clients understand their obligations from day one.",
    ],
  },
  "statement-of-service": {
    title: "Statement of Service best practices",
    category: "Operations",
    readTime: "5 min read",
    paragraphs: [
      "Statements of Service document work performed and confirm fees charged. Under OMARA obligations, clients must be able to understand what services were delivered and what they paid for.",
      "ImmiMate tracks work performed, fee confirmation, and client acknowledgement status — all visible from the compliance dashboard.",
      "Unacknowledged Statements of Service surface automatically so nothing slips through before an audit.",
    ],
  },
}

export function BlogPostPage({ slug }: { slug: string }) {
  const post = BLOG_POSTS[slug]

  if (!post) {
    return (
      <div className="bg-mate-offwhite py-32 text-center">
        <h1 className="font-display text-3xl text-mate-primary">Article not found</h1>
        <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-mate-accent">
          Back to blog
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <section className="border-b border-mate-border bg-white pt-32 pb-16 md:pt-36">
        <div className="container mx-auto max-w-[760px] px-6">
          <Link href="/blog" className="text-sm font-semibold text-mate-accent hover:underline">
            ← Back to blog
          </Link>
          <div className="mt-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
            <span>{post.category}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
          <h1 className="mt-4 font-display text-[2.5rem] font-normal leading-[1.1] tracking-[-0.03em] md:text-5xl">
            {post.title}
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-[760px] space-y-6 px-6">
          {post.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="text-base leading-8 text-mate-secondary">
              {p}
            </p>
          ))}
        </div>
      </section>

      <CTA />
    </div>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-mate-border py-10 last:border-b-0">
      <h2 className="font-display text-xl font-normal text-mate-primary">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-mate-muted">{children}</div>
    </div>
  )
}

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: { heading: string; body: React.ReactNode }[]
}) {
  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <section className="border-b border-mate-border bg-white pt-32 pb-12 md:pt-36">
        <div className="container mx-auto max-w-[760px] px-6">
          <SectionLabel>Legal</SectionLabel>
          <h1 className="mt-4 font-display text-4xl font-normal tracking-[-0.03em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-mate-muted">Last updated {updated}</p>
          <p className="mt-6 text-base leading-8 text-mate-secondary">{intro}</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-[760px] px-6">
          {sections.map((s) => (
            <LegalSection key={s.heading} title={s.heading}>
              {s.body}
            </LegalSection>
          ))}
        </div>
      </section>
    </div>
  )
}

// ----------------------------------------------------
// 5. ABOUT PAGE
// ----------------------------------------------------
export function AboutPage() {
  return (
    <div className="bg-mate-offwhite text-mate-primary">
      <PageHero
        eyebrow="Our origin"
        headline={
          <>
            <span className="block">Built for people who understand</span>
            <span className="block italic text-mate-secondary">regulated practice.</span>
          </>
        }
        subhead="We built ImmiMate because Australian migration professionals manage high-stakes personal details and deserve software designed around compliance, security, and on-shore data custody."
      />

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel>Our mission</SectionLabel>
              <EditorialHeadline
                className="mt-5"
                lines={[
                  <>Compliance proof</>,
                  <span className="italic text-mate-secondary">your practice.</span>,
                ]}
              />
              <p className="mt-6 text-base leading-7 text-mate-muted">
                Empower migration agents to eliminate administration friction, standardise
                compliant retainers, and secure client records — with every workflow connected
                to the client.
              </p>
            </div>
            <div className="border border-mate-border bg-mate-primary p-8 text-white md:p-10">
              <Building2 className="h-8 w-8 text-mate-accent" />
              <p className="mt-6 font-display text-2xl font-normal leading-snug">
                {APP_POSITIONING}
              </p>
              <p className="mt-4 text-sm leading-6 text-white/60">
                Not document signing software. A compliance operating system for migration
                practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-mate-border bg-mate-offwhite py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <SectionHeader title="Our structural values" />
          <div className="divide-y divide-mate-border border border-mate-border bg-white">
            {[
              {
                title: "Absolute compliance",
                text: "We trace domestic legal frameworks, ensuring agreements never breach OMARA Code guidelines.",
              },
              {
                title: "Sovereign custody",
                text: "No offshore compromises. All operational records reside completely inside Australia.",
              },
              {
                title: "Uncompromising reliability",
                text: "High-performance systems built for legal pipelines, backed by responsive domestic support.",
              },
            ].map((val) => (
              <div key={val.title} className="p-8">
                <h4 className="text-base font-medium text-mate-primary">{val.title}</h4>
                <p className="mt-2 text-sm leading-6 text-mate-muted">{val.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

export function PlaceholderMarketingPage({ title }: { title: string }) {
  return (
    <div className="bg-mate-offwhite py-24 text-mate-primary">
      <div className="container mx-auto max-w-[900px] px-6 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-mate-accent" />
        <h1 className="mt-6 font-display text-4xl font-normal tracking-tight">{title}</h1>
        <p className="mt-5 text-base leading-7 text-mate-muted">
          This page is part of the ImmiMate resource library.
        </p>
        <Button
          asChild
          className="mt-8 h-12 rounded-none bg-mate-primary px-8 font-semibold hover:bg-mate-charcoal"
        >
          <Link href="/resources">Browse resources</Link>
        </Button>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// 6. SECURITY PAGE
// ----------------------------------------------------
export function SecurityPage() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: "Sovereign Sydney hosting",
      desc: "Personal identities, passports, and signed agreements stored on AWS clusters in Sydney, Australia.",
    },
    {
      icon: LockKeyhole,
      title: "AES-256 encryption",
      desc: "Data encrypted at rest with AES-256 and in transit with TLS 1.3.",
    },
    {
      icon: Clock,
      title: "Immutable digital audits",
      desc: "Every send, review, and signature creates a digital certificate with transaction stamps.",
    },
    {
      icon: Users,
      title: "Practitioner isolation",
      desc: "Multi-tenant workspaces ensure RMAs access only their assigned client portfolios.",
    },
    {
      icon: FileCheck2,
      title: "SOC-2 & ISO aligned",
      desc: "Development, network failovers, and backup cycles map to SOC-2 and ISO-27001 standards.",
    },
    {
      icon: Workflow,
      title: "High availability backups",
      desc: "Real-time replica clusters with 99.9% uptime for continuous practice delivery.",
    },
  ]

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="Security"
        headline={
          <>
            <span className="block">Sovereign Australian data.</span>
            <span className="block italic text-mate-secondary">Uncompromising compliance.</span>
          </>
        }
        subhead="ImmiMate delivers the infrastructure needed to secure migration client matters and protect sensitive identity documents."
      />

      <section className="border-b border-mate-border bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-[1100px] px-6">
          <div className="divide-y divide-mate-border border border-mate-border bg-white">
            {pillars.map((pil) => (
              <div key={pil.title} className="flex gap-6 p-8">
                <pil.icon className="mt-1 h-5 w-5 shrink-0 text-mate-accent" />
                <div>
                  <h3 className="text-base font-medium text-mate-primary">{pil.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mate-muted">{pil.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-mate-border bg-mate-offwhite py-20 md:py-28">
        <div className="container mx-auto max-w-[900px] px-6 text-center">
          <SectionHeader
            title="Aligned with the Privacy Act 1988."
            text="Migration agents manage critical applicant histories, passport records, and finances. ImmiMate provides compliance-level data preservation out of the box."
          />
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["Sovereign hosted", "TLS 1.3", "MFA mandatory", "Hourly backups"].map((tag) => (
              <span
                key={tag}
                className="border border-mate-border bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-mate-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

// ----------------------------------------------------
// 7. CONTACT PAGE
// ----------------------------------------------------
export function ContactPage() {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    agency: "",
    marn: "",
    practitioners: "1",
    throughput: "under-50",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) return

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1500)
  }

  return (
    <div className="bg-mate-offwhite text-mate-primary antialiased">
      <PageHero
        eyebrow="Contact"
        headline={
          <>
            <span className="block">We are here to support</span>
            <span className="block italic text-mate-secondary">your practice.</span>
          </>
        }
        subhead="Have compliance questions, integration needs, or want dedicated agency onboarding? Connect with our Sydney-based team."
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto grid max-w-[1200px] gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-mate-border bg-white p-8 md:p-10">
            {isSubmitted ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-mate-accent" />
                <h3 className="mt-6 font-display text-2xl font-normal text-mate-primary">
                  Request submitted
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mate-muted">
                  Thanks, {formData.name}. A Sydney-based advisor will contact you within two
                  business hours.
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormData({
                      name: "",
                      email: "",
                      agency: "",
                      marn: "",
                      practitioners: "1",
                      throughput: "under-50",
                      message: "",
                    })
                  }}
                  className="mt-8 rounded-none bg-mate-primary font-semibold hover:bg-mate-charcoal"
                >
                  Submit another inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <h3 className="font-display text-xl font-normal text-mate-primary">
                    Practice inquiry
                  </h3>
                  <p className="mt-1 text-sm text-mate-muted">
                    Provide operational details to route your inquiry to the right advisor.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      Full name
                    </label>
                    <Input
                      required
                      placeholder="Jane Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-11 rounded-none border-mate-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      Email
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="jane@agency.com.au"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-11 rounded-none border-mate-border"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      Agency name
                    </label>
                    <Input
                      required
                      placeholder="Agency name"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="h-11 rounded-none border-mate-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      MARN
                    </label>
                    <Input
                      placeholder="7-digit MARN"
                      value={formData.marn}
                      onChange={(e) => setFormData({ ...formData, marn: e.target.value })}
                      className="h-11 rounded-none border-mate-border"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      Practitioner count
                    </label>
                    <select
                      aria-label="Practitioner count"
                      value={formData.practitioners}
                      onChange={(e) =>
                        setFormData({ ...formData, practitioners: e.target.value })
                      }
                      className="flex h-11 w-full rounded-none border border-mate-border bg-white px-3 text-sm text-mate-primary focus:outline-none focus:ring-1 focus:ring-mate-accent"
                    >
                      <option value="1">Solo practitioner (1 RMA)</option>
                      <option value="2-5">2 to 5 practitioners</option>
                      <option value="6-15">6 to 15 practitioners</option>
                      <option value="16+">16+ practitioners</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                      Agreement volume
                    </label>
                    <select
                      aria-label="Agreement volume"
                      value={formData.throughput}
                      onChange={(e) =>
                        setFormData({ ...formData, throughput: e.target.value })
                      }
                      className="flex h-11 w-full rounded-none border border-mate-border bg-white px-3 text-sm text-mate-primary focus:outline-none focus:ring-1 focus:ring-mate-accent"
                    >
                      <option value="under-50">Under 50 agreements/month</option>
                      <option value="50-150">50 to 150 agreements/month</option>
                      <option value="150+">150+ agreements/month</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-mate-muted">
                    Inquiry details
                  </label>
                  <textarea
                    required
                    placeholder="Describe your practice needs..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="flex min-h-[120px] w-full rounded-none border border-mate-border bg-white px-3 py-2 text-sm text-mate-primary focus:outline-none focus:ring-1 focus:ring-mate-accent"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-none bg-mate-primary font-semibold hover:bg-mate-charcoal"
                >
                  {isSubmitting ? "Submitting..." : "Submit practice request"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-10">
              <div>
                <SectionLabel>Our office</SectionLabel>
                <h4 className="mt-3 font-display text-2xl font-normal text-mate-primary">
                  Sydney HQ
                </h4>
                <p className="mt-2 text-sm leading-6 text-mate-muted">
                  Level 14, 175 Pitt Street
                  <br />
                  Sydney NSW 2000, Australia
                </p>
              </div>

              <div>
                <SectionLabel>Advising hours</SectionLabel>
                <p className="mt-3 text-sm leading-6 text-mate-muted">
                  Monday – Friday: 8:30 AM – 6:00 PM AEST
                  <br />
                  Weekend: Emergency support available.
                </p>
              </div>

              <div>
                <SectionLabel>Direct contacts</SectionLabel>
                <p className="mt-3 text-sm leading-6 text-mate-muted">
                  Sales: hello@immimate.app
                  <br />
                  Support: support@immimate.app
                  <br />
                  Phone: +61 (02) 8005 7416
                </p>
              </div>
            </div>

            <div className="mt-12 border border-mate-border bg-mate-primary p-8 text-white">
              <ShieldCheck className="h-6 w-6 text-mate-accent" />
              <h4 className="mt-4 font-medium">100% on-shore delivery</h4>
              <p className="mt-2 text-sm leading-6 text-white/60">
                All client databases, document attachments, and operational support are kept
                within Australia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

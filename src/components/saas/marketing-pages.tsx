"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSignature,
  Filter,
  FolderOpen,
  Library,
  LockKeyhole,
  MessageSquare,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const platformFeatures = [
  {
    icon: FileSignature,
    title: "Agreement automation",
    text: "Create MARA-ready agreements with guided matter, fee, terms and signer workflows.",
  },
  {
    icon: Library,
    title: "Document library",
    text: "Organise approved templates, client documents and internal resources by matter type.",
  },
  {
    icon: Users,
    title: "Multi-RMA collaboration",
    text: "Assign work, control access and keep every practitioner aligned across client files.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise security",
    text: "Role-based access, audit history and secure document handling for regulated teams.",
  },
  {
    icon: BarChart3,
    title: "Practice analytics",
    text: "Track agreements sent, signatures completed, revenue and document activity.",
  },
  {
    icon: Workflow,
    title: "Workflow visibility",
    text: "See every pending signature, stalled agreement and client action in one calm workspace.",
  },
]

const migrationProblems = [
  "Manual agreements slow down high-volume practices.",
  "Generic e-sign tools do not understand migration matter structures.",
  "Teams lose context across clients, signers, fees and documents.",
  "Compliance evidence is scattered across email, PDFs and spreadsheets.",
]

const faqs = [
  {
    q: "Can we switch plans later?",
    a: "Yes. You can upgrade or adjust your plan as your practice grows.",
  },
  {
    q: "Is a credit card required for the trial?",
    a: "No. Teams can start a 14-day trial without entering card details.",
  },
  {
    q: "Do you support multi-RMA teams?",
    a: "Yes. Agency plans include team roles, access controls and collaboration workflows.",
  },
]

const resources = [
  {
    type: "Guide",
    title: "How to structure compliant service agreements",
    category: "Compliance",
    time: "8 min read",
  },
  {
    type: "Template",
    title: "Partner visa agreement checklist",
    category: "Templates",
    time: "Download",
  },
  {
    type: "Article",
    title: "Reducing signature delays in migration practices",
    category: "Operations",
    time: "6 min read",
  },
  {
    type: "Guide",
    title: "Building an audit-ready document workflow",
    category: "Security",
    time: "10 min read",
  },
  {
    type: "Template",
    title: "Client onboarding email pack",
    category: "Templates",
    time: "Download",
  },
  {
    type: "Article",
    title: "What high-performing RMAs measure each week",
    category: "Analytics",
    time: "5 min read",
  },
]

function PageShell({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string
  title: string
  highlight?: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white text-[#081B2E] antialiased">
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-24 pb-12">
        <div className="container mx-auto grid max-w-[1400px] gap-12 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm">
              <Sparkles className="h-4 w-4 text-[#0D9F8C]" />
              {eyebrow}
            </div>
            <h1 className="mt-7 font-serif text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#081b36] md:text-6xl lg:text-[4.5rem]">
              {title}
              {highlight && <span className="block text-[#0D9F8C] italic">{highlight}</span>}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 font-medium">
              {description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="h-12 rounded-xl bg-[#0D9F8C] px-8 font-bold shadow-[0_12px_24px_rgba(13,159,140,0.15)] transition-all duration-300 hover:bg-[#0A5B52] hover:shadow-[0_16px_30px_rgba(13,159,140,0.25)] hover:-translate-y-0.5">
                Start 14-Day Free Trial
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white px-8 font-bold text-[#0A5B52] shadow-sm transition-all duration-300 hover:bg-emerald-50/50 hover:border-slate-350 hover:-translate-y-0.5"
              >
                Book a Demo
              </Button>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>
      {children}
    </div>
  )
}

function DashboardPreview() {
  return (
    <div className="relative min-w-0">
      <div className="absolute -inset-6 rounded-[2rem] bg-[#0D9F8C]/6 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white bg-white shadow-[0_30px_80px_rgba(10,91,82,0.12)] transition-all duration-300 hover:-translate-y-1">
        <Image
          src="/images/demo_dashboard.png"
          alt="ImmiSign product dashboard"
          width={1764}
          height={1012}
          className="h-auto w-full max-w-full"
        />
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string
  title: string
  text?: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0D9F8C]">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-[-0.025em] text-[#081a36] md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && <p className="mt-4 text-base leading-7 text-slate-500 font-medium">{text}</p>}
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
}) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(13,159,140,0.12)]">
      <CardContent className="p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-[#0D9F8C]">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-lg font-black">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
      </CardContent>
    </Card>
  )
}

function CTA() {
  return (
    <section className="bg-white pb-20">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-emerald-100 bg-[linear-gradient(90deg,#e9fbf5_0%,#f7fffd_100%)] px-8 py-9 shadow-[0_18px_50px_rgba(13,159,140,0.08)] md:flex-row md:items-center md:px-12">
          <div>
            <h2 className="text-2xl font-black">Ready to simplify your migration practice?</h2>
            <p className="mt-2 text-slate-600">Launch a calmer, more compliant agreement workflow this week.</p>
          </div>
          <Button className="h-12 rounded-lg bg-[#0D9F8C] px-8 font-bold hover:bg-[#0A5B52]">
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Platform capabilities"
      title="A complete operating layer"
      highlight="for migration practices."
      description="ImmiSign brings agreements, documents, signatures, audit trails and analytics together in one purpose-built workspace for Australian migration professionals."
    >
      <section className="py-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <SectionHeader
            title="Built around the real work your practice does every day."
            text="Every module is designed for regulated document workflows, client accountability and clear team handoffs."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7FAF8] py-20">
        <div className="container mx-auto grid max-w-[1400px] gap-8 px-6 lg:grid-cols-3">
          {[
            {
              title: "Agreement workflow",
              text: "Step-by-step agreement creation with fees, matter details, terms, preview and send review.",
              icon: Workflow,
            },
            {
              title: "Document management",
              text: "Centralise reusable templates and sent files without losing client or matter context.",
              icon: FolderOpen,
            },
            {
              title: "Enterprise security",
              text: "Give leaders confidence with secure access, audit trails and role-based controls.",
              icon: LockKeyhole,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <item.icon className="h-8 w-8 text-[#0D9F8C]" />
              <h3 className="mt-6 text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-[#0D9F8C]">
                Analytics and integrations
              </div>
              <h2 className="mt-4 text-4xl font-black leading-tight">
                Make every signature, document and client action visible.
              </h2>
              <p className="mt-5 leading-8 text-slate-600">
                Leadership can see throughput, stalled work, document usage and
                team performance without chasing spreadsheets or email threads.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {["Matter-based reporting", "Signature analytics", "CSV exports", "API-ready structure"].map((item) => (
                  <div key={item} className="flex items-center gap-3 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-[#0D9F8C]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#061f1c] p-6 text-white shadow-[0_30px_80px_rgba(6,31,28,0.24)]">
              <div className="grid gap-4 sm:grid-cols-3">
                {["Agreements", "Signatures", "Revenue"].map((label, index) => (
                  <div key={label} className="rounded-xl bg-white/[0.08] p-5">
                    <div className="text-sm text-emerald-50/70">{label}</div>
                    <div className="mt-3 text-3xl font-black">{[84, 92, 128][index]}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-64 rounded-xl bg-[linear-gradient(180deg,rgba(51,196,141,0.22),rgba(51,196,141,0.02))] p-6">
                <div className="flex h-full items-end gap-3">
                  {[35, 52, 46, 70, 62, 82, 76, 94].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-lg bg-[#33C48D]" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <CTA />
    </PageShell>
  )
}

export function MigrationAgentsPage() {
  return (
    <PageShell
      eyebrow="For migration agents"
      title="Designed for the pressure"
      highlight="inside migration work."
      description="Generic signing tools stop at the PDF. ImmiSign supports the full practice workflow: clients, matters, fees, agreements, evidence and team accountability."
    >
      <section className="py-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeader
                eyebrow="The problem"
                title="Migration practices need more than e-signature."
                text="They need repeatable compliance workflows and a trustworthy operational record."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {migrationProblems.map((problem) => (
                <div key={problem} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <Scale className="h-6 w-6 text-[#0D9F8C]" />
                  <p className="mt-4 font-bold leading-6">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7FAF8] py-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <SectionHeader title="A workflow built around Australian migration matters." />
          <div className="mt-12 grid gap-5 md:grid-cols-6">
            {["Client", "Matter", "Fees", "Terms", "Signature", "Audit"].map((step, index) => (
              <div key={step} className="relative rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0D9F8C] text-sm font-black text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 font-black">{step}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {[
                    "Capture client details once.",
                    "Select matter type and scope.",
                    "Structure professional fees.",
                    "Apply approved clauses.",
                    "Send with signer tracking.",
                    "Retain a complete record.",
                  ][index]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto grid max-w-[1400px] gap-8 px-6 lg:grid-cols-3">
          {[
            { icon: FileCheck2, title: "MARA compliance", text: "Consistent templates and tracked agreement versions help standardise your practice." },
            { icon: Clock3, title: "Audit logs", text: "Every send, view, signature and update is visible in the matter record." },
            { icon: MessageSquare, title: "Team collaboration", text: "RMAs and admin teams work from the same source of truth." },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </section>
      <CTA />
    </PageShell>
  )
}

export function PricingPage() {
  return (
    <div className="bg-white text-[#081B2E] antialiased">
      <section className="border-b border-slate-100 bg-[#f8fcfb] py-24">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          <div className="inline-flex rounded-full border border-emerald-100/60 bg-white p-1 shadow-sm">
            <button className="rounded-full bg-[#0D9F8C] px-5 py-2 text-sm font-bold text-white shadow-sm">Monthly</button>
            <button className="rounded-full px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Yearly - save 20%</button>
          </div>
          <h1 className="mt-8 font-serif text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#081b36] md:text-6xl lg:text-7xl">
            Pricing that scales with <span className="italic text-[#0D9F8C]">your practice.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Start lean, then add team workflows, reporting and enterprise controls as your agency grows.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto grid max-w-[1200px] gap-6 px-6 lg:grid-cols-3">
          {[
            { name: "Starter", price: "$49", text: "For solo RMAs getting started.", features: ["25 agreements/month", "Core templates", "Document library", "Email support"] },
            { name: "Pro", price: "$129", text: "For growing practices.", features: ["Unlimited agreements", "Multi-RMA collaboration", "Analytics", "Priority support"], popular: true },
            { name: "Agency", price: "Custom", text: "For larger teams and enterprise needs.", features: ["Advanced roles", "Custom templates", "Security review", "Dedicated onboarding"] },
          ].map((plan) => (
            <Card key={plan.name} className={`rounded-2xl ${plan.popular ? "border-[#0D9F8C] shadow-[0_30px_80px_rgba(13,159,140,0.2)]" : "border-slate-200"}`}>
              <CardContent className="p-8">
                {plan.popular && <div className="mb-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C]">Most popular</div>}
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="pb-2 text-slate-500">/mo</span>}
                </div>
                <p className="mt-4 text-slate-600">{plan.text}</p>
                <Button className={`mt-7 h-11 w-full rounded-lg font-bold ${plan.popular ? "bg-[#0D9F8C] hover:bg-[#0A5B52]" : "bg-[#081B2E] hover:bg-slate-800"}`}>
                  {plan.price === "Custom" ? "Contact sales" : "Start trial"}
                </Button>
                <div className="mt-7 space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm font-semibold">
                      <Check className="h-4 w-4 text-[#0D9F8C]" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-[#F7FAF8] py-16">
        <div className="container mx-auto max-w-[1100px] px-6">
          <SectionHeader title="Compare core capabilities" />
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {["MARA templates", "Document library", "Team roles", "Analytics", "Priority onboarding"].map((row, index) => (
              <div key={row} className="grid grid-cols-4 border-b border-slate-100 p-4 text-sm last:border-b-0">
                <div className="font-bold">{row}</div>
                <div className="text-center">{index < 2 ? "Included" : "-"}</div>
                <div className="text-center font-bold text-[#0D9F8C]">Included</div>
                <div className="text-center font-bold text-[#0D9F8C]">Included</div>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-black">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </div>
  )
}

export function ResourcesPage() {
  return (
    <div className="bg-white text-[#081B2E] antialiased">
      <section className="bg-[#f8fcfb] py-24 border-b border-slate-100">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0D9F8C]">Resources</div>
              <h1 className="mt-4 font-serif text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#081b36] md:text-6xl">A practical library for <span className="italic text-[#0D9F8C]">modern migration practices.</span></h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">Guides, templates and operating resources to help teams move faster with confidence.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="text-sm font-black text-[#0D9F8C]">Featured guide</div>
              <h2 className="mt-3 text-2xl font-black">The complete agreement workflow checklist</h2>
              <p className="mt-3 leading-7 text-slate-600">A practical guide to standardising agreement preparation, review, sending and audit trails.</p>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-12 rounded-lg border-slate-200 bg-white pl-11" placeholder="Search guides, templates and articles" />
            </div>
            <Button variant="outline" className="h-12 rounded-lg bg-white font-bold">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="mb-8 flex flex-wrap gap-3">
            {["All", "Compliance", "Templates", "Operations", "Analytics", "Security"].map((category, index) => (
              <button key={category} className={`rounded-full px-4 py-2 text-sm font-bold ${index === 0 ? "bg-[#0D9F8C] text-white" : "bg-slate-100 text-slate-700"}`}>{category}</button>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {resources.map((item) => (
              <Card key={item.title} className="rounded-xl border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-[#0D9F8C]">
                    <span>{item.type}</span>
                    <span>{item.category}</span>
                  </div>
                  <h3 className="mt-5 min-h-[64px] text-xl font-black leading-tight">{item.title}</h3>
                  <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                    <span>{item.time}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export function AboutPage() {
  return (
    <div className="bg-white text-[#081B2E]">
      <section className="bg-[#F7FAF8] py-20">
        <div className="container mx-auto grid max-w-[1200px] gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[#0D9F8C]">About ImmiSign</div>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">Built by people who understand regulated migration work.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">We built ImmiSign because migration teams deserve software that respects the seriousness of client documentation, compliance and trust.</p>
          </div>
          <div className="rounded-2xl bg-[#061f1c] p-8 text-white shadow-[0_30px_80px_rgba(6,31,28,0.2)]">
            <Building2 className="h-10 w-10 text-[#33C48D]" />
            <h2 className="mt-8 text-3xl font-black">Our mission</h2>
            <p className="mt-4 leading-8 text-emerald-50/80">Help Australian migration professionals run more compliant, more efficient and more client-friendly practices.</p>
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Industry focus", text: "Designed for matter types, signers, fees and agreement workflows migration teams already use." },
              { title: "Trust and security", text: "A product posture built around regulated documents, privacy and access control." },
              { title: "Premium support", text: "Responsive onboarding and practical guidance for busy professional teams." },
            ].map((item) => (
              <Card key={item.title} className="rounded-xl border-slate-200">
                <CardContent className="p-7">
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-16">
            <SectionHeader title="A focused team building for a focused profession." />
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {["Product", "Migration operations", "Security"].map((team) => (
                <div key={team} className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-xl font-black text-[#0D9F8C]">{team[0]}</div>
                  <h3 className="mt-5 font-black">{team} team</h3>
                  <p className="mt-2 text-sm text-slate-600">Focused on building calm, reliable software for professional services.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <CTA />
    </div>
  )
}

export function PlaceholderMarketingPage({ title }: { title: string }) {
  return (
    <div className="bg-white py-24 text-[#081B2E]">
      <div className="container mx-auto max-w-[900px] px-6 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-[#0D9F8C]" />
        <h1 className="mt-6 text-5xl font-black tracking-tight">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          This page is part of the ImmiSign resource library and follows the same premium product system.
        </p>
        <Button asChild className="mt-8 h-12 rounded-lg bg-[#0D9F8C] px-8 font-bold hover:bg-[#0A5B52]">
          <Link href="/resources">Browse resources</Link>
        </Button>
      </div>
    </div>
  )
}

export function SecurityPage() {
  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-28 pb-16">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
            <ShieldCheck className="h-4 w-4 text-[#0D9F8C]" />
            Enterprise-Grade Protection
          </div>
          <h1 className="font-serif text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#081b36] md:text-6xl lg:text-7xl">
            Australian data custody. <br />
            <span className="italic text-[#0D9F8C]">Uncompromising security.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 font-medium">
            ImmiSign is engineered specifically for regulated legal-tech demands, ensuring the absolute confidentiality, integrity, and availability of your migration records.
          </p>
        </div>
      </section>

      {/* Grid of Security Pillars */}
      <section className="py-20">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">AWS Sydney Local Hosting</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                All client agreements, personal identity records, and visa documents are stored entirely on shore in Sydney, Australia. Never leaves Australian jurisdiction.
              </p>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">AES-256 Document Encryption</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                Every document is encrypted at rest using AES-256 standard and in transit via TLS 1.3. Your practice agreements remain secure and tamper-proof.
              </p>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <Clock3 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">Immutable Audit Logs</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                Every action is digitally stamped. Gain a complete, legally robust chain of custody record detailing exactly who sent, viewed, signed, or modified each document.
              </p>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">ISO 27001 Standards</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                Our operations, code reviews, and hosting architectures strictly align with ISO/IEC 27001 information security management principles.
              </p>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">Practitioner Access Controls</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                Restrict workspace actions with granular role-based access. Control exactly which RMAs, support staff, or admin teams can view specific client matters.
              </p>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
                <Workflow className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#081b36]">High Availability & Failovers</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 font-medium">
                Operate with peace of mind. Our active-active multi-region databases feature real-time backups and guarantee a 99.9% uptime for continuous practice delivery.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance / Privacy section */}
      <section className="bg-[#F7FAF8] py-20">
        <div className="container mx-auto max-w-[1000px] px-6 text-center">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-[#081b36] md:text-4xl">
            Strictly aligned with the <span className="italic text-[#0D9F8C]">Privacy Act 1988</span> and MARA guidelines.
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-slate-600 leading-7 font-medium">
            Migration agents manage sensitive personal information: passport numbers, family history, financials, and legal credentials. ImmiSign provides the absolute protection required to ensure complete code compliance.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {["Australian Hosted", "MFA Mandatory Option", "HIPAA/SOC-2 Aligned", "Daily Automated Backups"].map((badge) => (
              <div key={badge} className="rounded-xl border border-emerald-100 bg-white p-4 font-bold text-[#0A5B52] shadow-sm text-sm">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

export function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    agency: "",
    marn: "",
    practitioners: "1",
    throughput: "under-50",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-28 pb-16">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
            <MessageSquare className="h-4 w-4 text-[#0D9F8C]" />
            Get in touch
          </div>
          <h1 className="font-serif text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#081b36] md:text-6xl lg:text-7xl">
            We are here to support <br />
            <span className="italic text-[#0D9F8C]">your practice.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 font-medium">
            Have questions about MARA templates, custom integrations, enterprise bulk pricing, or security? Talk to our Sydney-based legal tech team.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Contact Form */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-8 shadow-sm">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] mb-6">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-black text-[#081b36]">Inquiry Received</h3>
                  <p className="mt-3 text-slate-600 font-medium max-w-md mx-auto">
                    Thanks for reaching out, {formData.name}! One of our onboarding specialists will review your agency size of {formData.practitioners} {parseInt(formData.practitioners) === 1 ? "practitioner" : "practitioners"} and get in touch within the next 2 business hours.
                  </p>
                  <Button onClick={() => setSubmitted(false)} className="mt-8 bg-[#0D9F8C] hover:bg-[#0A5B52]">
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-[#081b36]">Intake Contact Form</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Please provide details about your practice so we can connect you with the right support.</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Full Name</label>
                      <Input
                        required
                        placeholder="e.g. Rajwant Singh"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-11 rounded-xl border-slate-200/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Email Address</label>
                      <Input
                        required
                        type="email"
                        placeholder="e.g. rajwant@singhimmigration.com.au"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-11 rounded-xl border-slate-200/80"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Agency Name</label>
                      <Input
                        required
                        placeholder="e.g. Singh Immigration"
                        value={formData.agency}
                        onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                        className="h-11 rounded-xl border-slate-200/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">MARN (Optional)</label>
                      <Input
                        placeholder="7-digit Registration Number"
                        value={formData.marn}
                        onChange={(e) => setFormData({ ...formData, marn: e.target.value })}
                        className="h-11 rounded-xl border-slate-200/80"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Practitioner Count</label>
                      <select
                        value={formData.practitioners}
                        onChange={(e) => setFormData({ ...formData, practitioners: e.target.value })}
                        className="flex h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="1">Solo Practitioner (1 RMA)</option>
                        <option value="2-5">2 to 5 Practitioners</option>
                        <option value="6-15">6 to 15 Practitioners</option>
                        <option value="16+">16+ Practitioners / Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Visa Matter Volume (per month)</label>
                      <select
                        value={formData.throughput}
                        onChange={(e) => setFormData({ ...formData, throughput: e.target.value })}
                        className="flex h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="under-50">Under 50 matters/month</option>
                        <option value="50-150">50 to 150 matters/month</option>
                        <option value="150+">150+ matters/month</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Message / How can we help?</label>
                    <textarea
                      required
                      placeholder="Please tell us about your needs..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="flex min-h-[120px] w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <Button type="submit" className="h-12 w-full rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52] shadow-[0_12px_24px_rgba(13,159,140,0.15)] transition-all duration-300">
                    Submit Agency Request
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </form>
              )}
            </Card>

            {/* Sidebar Contact Info */}
            <div className="flex flex-col justify-between py-2">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0D9F8C]">Our Office</h3>
                  <h4 className="text-3xl font-serif text-[#081b36] mt-3">Sydney HQ</h4>
                  <p className="mt-3 text-slate-600 leading-7 font-medium">
                    Level 14, 175 Pitt Street<br />
                    Sydney NSW 2000, Australia
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0D9F8C]">Support Hours</h3>
                  <p className="mt-3 text-slate-600 leading-7 font-medium">
                    <strong>Monday – Friday:</strong> 8:30 AM – 6:00 PM AEST<br />
                    <strong>Weekend:</strong> Emergency document emergency support only.
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0D9F8C]">Direct Contacts</h3>
                  <p className="mt-3 text-slate-600 leading-7 font-medium">
                    <strong>Sales:</strong> hello@immisign.com.au<br />
                    <strong>Support:</strong> support@immisign.com.au<br />
                    <strong>Phone:</strong> +61 (02) 8005 7416
                  </p>
                </div>
              </div>

              <div className="mt-12 rounded-2xl bg-[#061f1c] p-6 text-white shadow-sm border border-emerald-950">
                <ShieldCheck className="h-8 w-8 text-[#33C48D]" />
                <h4 className="text-xl font-bold mt-4">100% On-shore Support</h4>
                <p className="text-sm text-emerald-100/70 leading-6 font-medium mt-2">
                  All customer support, data hosting, operations, and development are kept completely inside Australia for absolute privacy and safety compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

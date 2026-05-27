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
  Sparkles,
  Users,
  Workflow,
  FileText,
  TrendingUp,
  Fingerprint,
  Globe,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
    <div className="mx-auto max-w-3xl text-center mb-16">
      {eyebrow && (
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0D9F8C] mb-4">
          {eyebrow}
        </div>
      )}
      <h2 className="font-serif text-3xl font-normal leading-tight tracking-[-0.025em] text-[#081a36] md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && <p className="mt-4 text-base leading-7 text-slate-500 font-semibold">{text}</p>}
    </div>
  )
}

function CTA() {
  return (
    <section className="bg-white pb-24 md:pb-32">
      <div className="container mx-auto max-w-[1400px] px-6">
        <div className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-emerald-100 bg-[radial-gradient(circle_at_12%_0%,rgba(51,196,141,0.12),transparent_28%),linear-gradient(90deg,#e9fbf5_0%,#f7fffd_100%)] px-8 py-12 shadow-[0_18px_50px_rgba(13,159,140,0.08)] md:flex-row md:items-center md:px-14">
          <div>
            <h2 className="font-serif text-2xl font-normal text-[#081b36] md:text-3xl">Ready to simplify your migration practice?</h2>
            <p className="mt-2 text-sm md:text-base text-slate-500 font-semibold">Launch a calmer, more compliant agreement workflow this week.</p>
          </div>
          <Button asChild className="h-12 rounded-xl bg-[#0D9F8C] px-8 font-bold hover:bg-[#0A5B52] shadow-sm">
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------
// 1. FEATURES PAGE
// ----------------------------------------------------
export function FeaturesPage() {
  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Centered Editorial Hero */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top,rgba(13,159,140,0.12),transparent_55%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_95%)] pt-32 pb-20 text-center">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
            <Sparkles className="h-4 w-4 text-[#0D9F8C]" />
            Platform Capabilities
          </div>
          <h1 className="font-sans text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] text-[#081b36] md:text-7xl max-w-4xl mx-auto">
            Everything your migration practice needs.<br />
            <span className="font-serif font-normal text-[#0D9F8C] italic tracking-[-0.025em] text-[0.92em]">In one intelligent workspace.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed text-slate-600 font-medium">
            ImmiSign brings agreements, documents, signatures, audit trails and analytics together in one purpose-built workspace for Australian migration professionals.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center items-center">
            <Button asChild className="h-12 rounded-xl bg-[#0D9F8C] px-8 font-bold shadow-[0_12px_24px_rgba(13,159,140,0.15)] transition-all duration-300 hover:bg-[#0A5B52]">
              <Link href="/signup">Start 14-Day Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-8 font-bold text-[#0A5B52] shadow-sm transition-all duration-300 hover:bg-slate-50">
              <Link href="/contact">Book a Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bento Grid Visuals Section */}
      <section className="py-24 bg-white relative border-b border-slate-100/60">
        <div className="container mx-auto max-w-[1400px] px-6">
          <SectionHeader
            eyebrow="Interactive Workspace"
            title="A visual operating system for regulated practices"
          />
          
          {/* Bento Grid */}
          <div className="grid gap-6 md:grid-cols-12 auto-rows-[200px] mt-12">
            
            {/* Card 1: E-Sign Status Widget (Large 7 cols, 2 rows) */}
            <div className="md:col-span-7 md:row-span-2 rounded-2xl border border-slate-200/60 bg-[#fbfdfc] p-8 shadow-sm flex flex-col justify-between hover:shadow-elevated hover:border-[#0D9F8C]/20 transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase text-[#0D9F8C] tracking-wider">Live Transaction Tracker</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#0D9F8C] text-[9px] font-black uppercase">Verified Signed</span>
                </div>
                <h3 className="text-xl font-extrabold text-[#081b36]">Biometric Document Hash Log</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Real-time cryptographic audit trails proving signer authenticity.</p>
              </div>
              <div className="mt-6 rounded-xl border border-slate-200/40 bg-white p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Applicant</span>
                  <span className="text-[#081b36] font-semibold">Simran Kaur (Subclass 820)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Practitioner Auth</span>
                  <span className="text-[#081b36] font-semibold">Rajwant Singh (MARN 1794016)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>SMS Token IP</span>
                  <span className="text-emerald-600 font-mono font-semibold">203.0.113.82 (ap-southeast-2)</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span>SHA-256: 8a4c10f8b9e69c2d1b7a5e9f4c3a2b10f9e8d7c6b5a4f3e2d1c0</span>
                </div>
              </div>
            </div>

            {/* Card 2: Compliance Checklist (5 cols, 2 rows) */}
            <div className="md:col-span-5 md:row-span-2 rounded-2xl border border-slate-200/60 bg-[#fbfdfc] p-8 shadow-sm flex flex-col justify-between hover:shadow-elevated hover:border-[#0D9F8C]/20 transition-all duration-300">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider">Regulatory Shield</span>
                <h3 className="text-lg font-extrabold text-[#081b36] mt-2">OMARA Compliance Guard</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Automated template locking matching mandatory disclosure rules.</p>
              </div>
              <div className="space-y-3 mt-4">
                {[
                  "Client MARN details verified",
                  "Consumer Guide documentation attached",
                  "Itemized Professional Fee Schedules set",
                  "Refund terms & disbursements logs ready"
                ].map((rule) => (
                  <div key={rule} className="flex gap-3 items-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Uptime and Data Hosting (4 cols, 1 row) */}
            <div className="md:col-span-4 rounded-2xl border border-slate-200/60 bg-[#fbfdfc] p-6 shadow-sm flex flex-col justify-between hover:shadow-elevated hover:border-[#0D9F8C]/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100/50 text-[#0D9F8C] text-[9px] font-black">99.9% Uptime</span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#081b36]">Sydney Hosting</h4>
                <p className="text-[10px] text-slate-400 font-semibold">100% on-shore database backups.</p>
              </div>
            </div>

            {/* Card 4: Metrics (4 cols, 1 row) */}
            <div className="md:col-span-4 rounded-2xl border border-slate-200/60 bg-[#fbfdfc] p-6 shadow-sm flex flex-col justify-between hover:shadow-elevated hover:border-[#0D9F8C]/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-purple-600">85% Faster</span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#081b36]">45-Minute Turnaround</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Average agreement turnaround speed.</p>
              </div>
            </div>

            {/* Card 5: Team Workspace (4 cols, 1 row) */}
            <div className="md:col-span-4 rounded-2xl border border-slate-200/60 bg-[#fbfdfc] p-6 shadow-sm flex flex-col justify-between hover:shadow-elevated hover:border-[#0D9F8C]/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shadow-sm">
                  <Users className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded bg-pink-50 text-pink-600 text-[9px] font-black">Admin + RMA</span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#081b36]">Granular Workspace Isolation</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Role restrictions based on assignee portfolios.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Detailed Alternating Capability Segments */}
      <section className="py-24 bg-[#f9fbf9] border-b border-slate-100/60">
        <div className="container mx-auto max-w-[1200px] px-6 space-y-32">
          
          {/* Section 1: Workflow Automation */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Workflow Automation</span>
              <h3 className="font-serif text-3xl font-normal leading-tight text-[#081b36] mt-4 md:text-4xl">
                Automated Service Retainers
              </h3>
              <p className="mt-4 text-slate-500 font-semibold leading-relaxed text-sm md:text-base">
                Ditch the copy-paste errors. Build customized visa structures with standardized retainers, itemized disbursements, and refund policy locks across all matter subclasses.
              </p>
              <ul className="space-y-3 mt-6">
                {["Flexible client milestones mapping", "Custom itemized disbursement lists", "Department fee variables automatic inclusions"].map((li) => (
                  <li key={li} className="flex gap-2 items-center text-xs font-bold text-slate-600">
                    <Check className="h-4 w-4 text-[#0D9F8C]" />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 text-xs font-bold text-[#081b36]">
                <span>Retainer Settings</span>
                <span className="text-xs font-extrabold text-[#0D9F8C]">Subclass 189 Retainer</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Milestone 1: Intake Draft</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-bold text-[#081b36]">50% Upfront Retainer</span>
                    <span className="text-xs font-black text-[#0D9F8C]">$2,250.00</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Milestone 2: DHA Lodgement</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-bold text-[#081b36]">50% Milestone Settlement</span>
                    <span className="text-xs font-black text-[#0D9F8C]">$2,250.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Document Generation */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-last md:order-first rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="h-8 w-8 rounded bg-emerald-50 text-[#0D9F8C] flex items-center justify-center font-bold">A</div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#081b36]">Client Vault Archive</h4>
                  <p className="text-[9px] text-slate-400 font-bold">2 active files, 1 verified signed</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-bold text-slate-600">signed_retainer_820.pdf</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100/50 text-[#0D9F8C] font-black text-[9px]">SIGNED</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-bold text-slate-600">passport_identity_verif.pdf</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100/50 text-amber-700 font-black text-[9px]">AWAITING</span>
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">Document Generation</span>
              <h3 className="font-serif text-3xl font-normal leading-tight text-[#081b36] mt-4 md:text-4xl">
                Centralized Secure File Vault
              </h3>
              <p className="mt-4 text-slate-500 font-semibold leading-relaxed text-sm md:text-base">
                Consolidate all client passport proofs, evidence records, and signed agreements within a single secure legal-grade portal folder.
              </p>
              <ul className="space-y-3 mt-6">
                {["Secure 256-bit client-facing intake links", "Organized matter subclasses directories", "Audit compliance document storage records"].map((li) => (
                  <li key={li} className="flex gap-2 items-center text-xs font-bold text-slate-600">
                    <Check className="h-4 w-4 text-[#0D9F8C]" />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 3: E-Signatures & Security */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-purple-600">E-Signatures & Audit Trails</span>
              <h3 className="font-serif text-3xl font-normal leading-tight text-[#081b36] mt-4 md:text-4xl">
                Biometric Identity Stamp
              </h3>
              <p className="mt-4 text-slate-500 font-semibold leading-relaxed text-sm md:text-base">
                Every signature turnaround records full transactional histories. Confirmed client IP details, timestamp audits, and SMS identity tokens provide legally robust audit compliance documents.
              </p>
              <ul className="space-y-3 mt-6">
                {["Tamper-evident hash validation certifications", "SMS biometric authentication layers", "Sovereign Australian data custody guidelines"].map((li) => (
                  <li key={li} className="flex gap-2 items-center text-xs font-bold text-slate-600">
                    <Check className="h-4 w-4 text-[#0D9F8C]" />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-4">
                <span>Sign Verification Certificate</span>
                <span className="text-emerald-600 font-black">Passed</span>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex gap-4 items-center">
                <Fingerprint className="h-8 w-8 text-[#0D9F8C]" />
                <div>
                  <h4 className="text-xs font-extrabold text-[#081b36]">SHA-256 Integrity Verification</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">Document timestamp sealed on ap-southeast-2 Sydney server</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Integrations Grid Showcase */}
      <section className="bg-white py-24 border-b border-slate-100/60">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Ecosystem Connections</span>
          <h2 className="mt-4 font-serif text-3xl font-normal leading-tight text-[#081b36] md:text-4xl lg:text-5xl">
            Integrates with your existing workflow
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500 font-semibold leading-relaxed text-sm md:text-base">
            Keep your legal systems connected. ImmiSign syncs with standard practice management, database, and invoicing protocols.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {[
              { name: "Xero Syncing", desc: "Instantly create client invoices and match milestones." },
              { name: "Stripe Billing", desc: "Receive immediate upfront deposits directly via credit cards." },
              { name: "Google Drive Backup", desc: "Automatically export finalized signed PDF retainers." },
              { name: "Email Portals", desc: "Dispatch OMARA forms via your custom agency domain." }
            ].map((item) => (
              <div key={item.name} className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm text-left">
                <h4 className="text-sm font-extrabold text-[#0A5B52]">{item.name}</h4>
                <p className="mt-2 text-xs text-slate-500 font-semibold leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  )
}

export function MigrationAgentsPage() {
  const problems = [
    { title: "Manual Retainers Slow Growth", text: "Drafting OMARA-ready agreements for every Subclass 820 or 189 manually drains hours that could be spent advising." },
    { title: "Generic E-Sign Lacks Context", text: "Standard tools don't understand migration billing. They don't support itemized disbursement schedules or legal variables." },
    { title: "Scattered Compliance Evidences", text: "If files are divided across drives and emails, audit preparations become a stressful, unorganized race." },
    { title: "Lack of Internal Team Lockout", text: "Without permissions, administrative assistants can accidentally edit legal clause language before sending." }
  ]

  const timelineSteps = [
    {
      phase: "01",
      title: "Client Intake",
      desc: "Collect passport details, personal files, and history parameters securely upfront.",
      icon: Users
    },
    {
      phase: "02",
      title: "Retainer Compilation",
      desc: "Generate OMARA-vetted service structures, milestone payments, and subclass schedules.",
      icon: FileText
    },
    {
      phase: "03",
      title: "Biometric Signing",
      desc: "Authenticate applicant identity via dual-factor email and secure SMS verification.",
      icon: Fingerprint
    },
    {
      phase: "04",
      title: "Visa Submission",
      desc: "Lodge with the Department of Home Affairs, archiving standard OMARA notices.",
      icon: FileCheck2
    },
    {
      phase: "05",
      title: "Practice Compliance",
      desc: "Retain legally binding, tamper-evident audit records on-shore for 7 years.",
      icon: ShieldCheck
    }
  ]

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Editorial Storytelling Hero */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-32 pb-24">
        <div className="container mx-auto max-w-[1400px] px-6 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="animate-enter max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
              <Scale className="h-4 w-4 text-[#0D9F8C]" />
              RMA Operational Software
            </div>
            <h1 className="font-sans text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#081b36] md:text-6xl lg:text-[4rem]">
              Designed for the real pressure <br />
              <span className="font-serif font-normal text-[#0D9F8C] italic">of Australian migration work.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-600 font-medium">
              Managing strict lodgement deadlines, applicant anxieties, and compliance reviews is stressful enough. Compiling and sending your client service agreements should not be.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild className="h-12 rounded-xl bg-[#0D9F8C] px-8 font-bold shadow-[0_12px_24px_rgba(13,159,140,0.15)] transition-all duration-300 hover:bg-[#0A5B52]">
                <Link href="/signup">Start Solo RMA Trial</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-8 font-bold text-[#0A5B52] shadow-sm transition-all duration-300 hover:bg-slate-50">
                <Link href="/contact">Connect With Onboarding</Link>
              </Button>
            </div>
          </div>
          
          {/* Right visual: Client Lifecycle Timeline diagram */}
          <div className="relative rounded-2xl border border-slate-200/50 bg-white/60 p-8 shadow-sm backdrop-blur-md">
            <h3 className="text-sm font-black text-[#081b36] uppercase tracking-wider mb-6">Client Lifecycle Pipeline</h3>
            <div className="space-y-6 relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#33C48D] via-[#0D9F8C] to-slate-200" />
              {timelineSteps.map((step) => (
                <div key={step.phase} className="flex gap-4 items-start relative z-10">
                  <div className="h-9 w-9 rounded-full bg-white border-2 border-[#0D9F8C] text-[#0D9F8C] flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                    {step.phase}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#081b36]">{step.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Matrix */}
      <section className="py-24 bg-white">
        <div className="container mx-auto max-w-[1400px] px-6">
          <SectionHeader
            eyebrow="The Practice Dilemma"
            title="Migration practices need more than generic e-signature."
            text="They require standardized legal structures, on-shore database backups, and repeatable compliance records."
          />

          <div className="grid gap-6 md:grid-cols-2 mt-12">
            {problems.map((prob) => (
              <div key={prob.title} className="rounded-2xl border border-slate-200 bg-[#fbfdfc] p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <Scale className="h-6 w-6 text-[#0D9F8C]" />
                <h4 className="mt-4 text-base font-extrabold text-[#081b36]">{prob.title}</h4>
                <p className="mt-2 text-sm text-slate-500 font-semibold leading-relaxed">{prob.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparative Risk Check Table */}
      <section className="bg-[#f9fbf9] py-24 border-y border-slate-100">
        <div className="container mx-auto max-w-[1000px] px-6">
          <SectionHeader
            eyebrow="Compliance Audit Analysis"
            title="Generic tools vs. ImmiSign Legal-Tech"
            text="Understand the structural compliance advantages built specifically for migration firms."
          />

          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-3 bg-[#fbfdfc] border-b border-slate-200/80 p-5 text-xs font-black text-[#081b36] uppercase tracking-wider">
              <div>Compliance Feature</div>
              <div className="text-center text-slate-400">Generic E-Sign (DocuSign/Adobe)</div>
              <div className="text-center text-[#0D9F8C]">ImmiSign Legal-Tech</div>
            </div>
            {[
              { f: "OMARA Template Lockout", g: "Static blank PDFs / Manual drafts", i: "Dynamic locked subclass templates" },
              { f: "Sovereign Data Residency", g: "Stored offshore in global servers", i: "100% Hosted on-shore in Sydney, NSW" },
              { f: "Identity Audits", g: "Simple email confirmation link", i: "Biometric SMS + Email double verification" },
              { f: "Compliance Logs Retention", g: "Standard variable logs", i: "Immutable logs sealed for 7 years" },
              { f: "Workspace Portfolios Access", g: "Shared generic storage folders", i: "Granular assignee role separations" }
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 border-b border-slate-100 p-5 text-xs sm:text-sm last:border-b-0">
                <div className="font-extrabold text-[#081b36]">{row.f}</div>
                <div className="text-center font-semibold text-slate-400">{row.g}</div>
                <div className="text-center font-bold text-[#0D9F8C]">{row.i}</div>
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
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("yearly")

  const pricingPlans = [
    {
      name: "Starter",
      monthlyPrice: 49,
      yearlyPrice: 39,
      desc: "For solo RMAs getting started.",
      features: [
        "25 OMARA agreements/month",
        "Core subclass templates",
        "Sovereign Sydney file backup",
        "Email support",
        "Standard templates library",
      ]
    },
    {
      name: "Pro",
      monthlyPrice: 129,
      yearlyPrice: 99,
      desc: "For growing migration practices.",
      features: [
        "Unlimited OMARA agreements",
        "Multi-RMA workspaces collaboration",
        "Biometric SMS signature logs",
        "Custom legal clause locker",
        "Advanced pipeline reports",
      ],
      popular: true
    },
    {
      name: "Agency",
      monthlyPrice: "Custom",
      yearlyPrice: "Custom",
      desc: "For larger legal teams & multi-offices.",
      features: [
        "Bespoke legal review alignments",
        "Fully managed templates conversion",
        "Dedicated onboarding manager",
        "API integration endpoints",
        "Strict tenant data isolations",
      ]
    }
  ]

  const comparisonRows = [
    { feature: "OMARA Template Lockout", starter: "Included", pro: "Included", agency: "Included" },
    { feature: "Sovereign Sydney Storage", starter: "Included", pro: "Included", agency: "Included" },
    { feature: "Multi-RMA Workspaces", starter: "-", pro: "Included", agency: "Included" },
    { feature: "Biometric SMS Verification", starter: "-", pro: "Included", agency: "Included" },
    { feature: "API Database Integrations", starter: "-", pro: "-", agency: "Included" },
    { feature: "Custom SLA Support", starter: "-", pro: "-", agency: "Included" },
  ]

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-28 pb-14 text-center">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="inline-flex rounded-full border border-emerald-100 bg-white p-1 shadow-sm mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${billingCycle === "monthly" ? "bg-[#0D9F8C] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${billingCycle === "yearly" ? "bg-[#0D9F8C] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Yearly (Save 20%)
            </button>
          </div>

          <h1 className="font-sans text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#081b36] md:text-6xl lg:text-7xl">
            Pricing that scales with <br />
            <span className="font-serif font-normal text-[#0D9F8C] italic">your practice.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600 font-medium">
            Start small, then unlock robust RMAs collaboration, custom clause lockers, and advanced security as your agency expands.
          </p>
        </div>
      </section>

      {/* Plan Cards Grid */}
      <section className="py-24">
        <div className="container mx-auto grid max-w-[1200px] gap-8 px-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => {
            const isCustom = plan.monthlyPrice === "Custom"
            const priceVal = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
            
            return (
              <Card
                key={plan.name}
                className={`rounded-2xl border bg-white p-8 flex flex-col justify-between transition-all duration-300 ${plan.popular ? "border-[#0D9F8C] shadow-elevated" : "border-slate-200/80 shadow-sm"}`}
              >
                <div>
                  {plan.popular && <span className="mb-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-[#0D9F8C] uppercase tracking-wider">Most popular</span>}
                  <h3 className="text-2xl font-extrabold text-[#081b36]">{plan.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">{plan.desc}</p>
                  
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-5xl font-black text-[#081b36]">
                      {isCustom ? "Custom" : `$${priceVal}`}
                    </span>
                    {!isCustom && <span className="pb-1.5 text-sm text-slate-400 font-bold">/mo</span>}
                  </div>
                  {billingCycle === "yearly" && !isCustom && (
                    <span className="text-[10px] font-bold text-[#0D9F8C] block mt-1">Billed annually</span>
                  )}

                  <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Check className="h-4 w-4 shrink-0 text-[#0D9F8C]" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <Button
                    asChild
                    className={`h-11 w-full rounded-xl font-bold transition-all duration-300 ${plan.popular ? "bg-[#0D9F8C] hover:bg-[#0A5B52] shadow-sm" : "bg-[#081B2E] hover:bg-slate-800 text-white"}`}
                  >
                    <Link href={isCustom ? "/contact" : "/signup"}>
                      {isCustom ? "Contact Sales" : "Start Free Trial"}
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-[#f9fbf9] py-24 border-y border-slate-100">
        <div className="container mx-auto max-w-[1000px] px-6">
          <SectionHeader title="Compare core capabilities" />

          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-4 bg-[#fbfdfc] border-b border-slate-200/80 p-5 text-xs font-extrabold text-[#081b36] uppercase tracking-wider">
              <div>Capability</div>
              <div className="text-center">Starter</div>
              <div className="text-center">Pro</div>
              <div className="text-center">Agency</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.feature} className="grid grid-cols-4 border-b border-slate-100 p-5 text-sm last:border-b-0">
                <div className="font-extrabold text-[#081b36]">{row.feature}</div>
                <div className="text-center font-semibold text-slate-500">{row.starter}</div>
                <div className={`text-center font-bold ${row.pro === "Included" ? "text-[#0D9F8C]" : "text-slate-400"}`}>{row.pro}</div>
                <div className="text-center font-bold text-[#0D9F8C]">{row.agency}</div>
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
export function ResourcesPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("All")

  const allResources = [
    {
      type: "Guide",
      title: "How to structure compliant OMARA service agreements",
      category: "Compliance",
      desc: "An outline of mandatory disclosure items, disbursements scheduling rules, and the OMARA Code guidelines.",
      time: "8 min read",
    },
    {
      type: "Template",
      title: "Subclass 820 Partner Visa retainer checklist",
      category: "Templates",
      desc: "Ready-to-use variables structure and fee payment breakdown guide matching Australian guidelines.",
      time: "Download (PDF)",
    },
    {
      type: "Article",
      title: "Reducing signature delays in migration practices",
      category: "Operations",
      desc: "Operational tips on deploying client onboarding sequences and SMS notifications to cut turnaround times.",
      time: "6 min read",
    },
    {
      type: "Guide",
      title: "Building an audit-ready document custody workflow",
      category: "Security",
      desc: "A security check detailing ISO-27001 parameters, Australian data hosting sovereignty, and audit logs.",
      time: "10 min read",
    },
    {
      type: "Template",
      title: "Standard client onboarding retainer email pack",
      category: "Templates",
      desc: "Professional templates package containing intake emails, review sequences, and OMARA guides links.",
      time: "Download (TXT)",
    },
    {
      type: "Article",
      title: "Key metric systems high-performing RMAs track",
      category: "Analytics",
      desc: "How leading practitioners calculate client throughput speeds, signature rates, and matter revenue.",
      time: "5 min read",
    },
  ]

  // Dynamic filter logic
  const filteredResources = allResources.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Hero Header */}
      <section className="bg-[#f8fcfb] py-28 border-b border-slate-100">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end mb-12">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Resource Library</span>
              <h1 className="mt-4 font-sans text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#081b36] md:text-6xl">
                A practical library for <br />
                <span className="font-serif font-normal text-[#0D9F8C] italic">modern migration practices.</span>
              </h1>
              <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-600 font-medium">
                Guides, templates and operating resources to help teams move faster with absolute compliance.
              </p>
            </div>
            
            {/* Featured guide card */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <span className="text-xs font-extrabold uppercase text-[#0D9F8C]">Featured Guide</span>
              <h3 className="mt-3 text-xl font-extrabold text-[#081b36]">The OMARA Agreement Preparation Handbook</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 font-semibold">
                An end-to-end regulatory guide to compiling compliant professional fee agreements, retainers, and disclosures safely.
              </p>
            </div>
          </div>

          {/* Interactive filter search controls */}
          <div className="flex flex-col gap-4 md:flex-row mt-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-white pl-11 shadow-sm font-semibold"
                placeholder="Search resources, templates, and compliance guides..."
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {["All", "Compliance", "Templates", "Operations", "Analytics", "Security"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${selectedCategory === cat ? "bg-[#0D9F8C] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Results */}
      <section className="py-24">
        <div className="container mx-auto max-w-[1200px] px-6">
          {filteredResources.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-slate-200 bg-[#fbfdfc]">
              <Info className="mx-auto h-8 w-8 text-[#0D9F8C]" />
              <h3 className="mt-4 text-lg font-bold text-[#081b36]">No Resources Found</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Try refining your search text or select another category above.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((item) => (
                <Card key={item.title} className="rounded-xl border-slate-200/80 bg-white p-7 shadow-sm flex flex-col justify-between hover:shadow-elevated transition-all duration-300">
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-[#0D9F8C] mb-4">
                      <span>{item.type}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.category}</span>
                    </div>
                    <h4 className="text-base font-extrabold text-[#081b36] min-h-[48px] leading-snug">{item.title}</h4>
                    <p className="mt-2 text-xs text-slate-500 font-semibold leading-relaxed min-h-[64px]">{item.desc}</p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0A5B52]">
                    <span>{item.time}</span>
                    <ArrowRight className="h-4 w-4 text-[#0D9F8C]" />
                  </div>
                </Card>
              ))}
            </div>
          )}
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
    <div className="bg-white text-[#081B2E]">
      <section className="bg-[#f9fbf9] py-28 border-b border-slate-100">
        <div className="container mx-auto grid max-w-[1200px] gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Our Origin</span>
            <h1 className="mt-4 font-sans text-5xl font-extrabold tracking-tight text-[#081b36] md:text-6xl">
              Built by people who understand <span className="font-serif font-normal text-[#0D9F8C] italic">regulated legal tech.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-600 font-medium">
              We built ImmiSign because Australian migration professionals manage high stakes personal details and deserve software designed around absolute security, compliance, and on-shore custody.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#021815] to-[#000504] p-8 text-white shadow-elevated border border-emerald-950">
            <Building2 className="h-10 w-10 text-[#33C48D]" />
            <h3 className="mt-8 font-serif text-3xl font-normal text-white">Our mission</h3>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100/80 font-semibold">
              Empower regulated migration agents to eliminate administration friction, standardize compliant retains, and secure client records securely.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24">
        <div className="container mx-auto max-w-[1200px] px-6">
          <SectionHeader title="Our structural values" />

          <div className="grid gap-8 md:grid-cols-3 mt-12">
            {[
              { title: "Absolute Compliance", text: "We trace domestic legal frameworks, ensuring agreements never breach OMARA Code guidelines." },
              { title: "Sovereign Custody", desc: "No offshore compromises. All operational records reside completely inside Australia." },
              { title: "Uncompromising Reliability", text: "High-performance systems built for legal pipelines, backed by responsive domestic support teams." }
            ].map((val) => (
              <Card key={val.title} className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
                <h4 className="text-lg font-extrabold text-[#081b36]">{val.title}</h4>
                <p className="mt-2 text-sm text-slate-500 font-semibold leading-relaxed">{val.text || val.desc}</p>
              </Card>
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

// ----------------------------------------------------
// 6. SECURITY PAGE
// ----------------------------------------------------
export function SecurityPage() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: "Sovereign Sydney Hosting",
      desc: "All personal identities, passports, and signed legal agreements are stored entirely on active AWS clusters in Sydney, Australia under domestic jurisdiction."
    },
    {
      icon: LockKeyhole,
      title: "AES-256 State Encryption",
      desc: "Data layers are encrypted utilizing industry-standard AES-256 at rest and secure TLS 1.3 encryption protocols in transit."
    },
    {
      icon: Clock,
      title: "Immutable Digital Audits",
      desc: "Every send, review, and signature creates an encrypted digital certificate, compiling legally robust transaction stamps."
    },
    {
      icon: Users,
      title: "Practitioner isolation",
      desc: "Granular multi-tenant workspaces ensure RMAs are restricted strictly to clients matching their portfolio profiles."
    },
    {
      icon: FileCheck2,
      title: "SOC-2 & ISO Aligned",
      desc: "Internal development, network failovers, and backup cycles map precisely to SOC-2 and ISO-27001 security standards."
    },
    {
      icon: Workflow,
      title: "High Availability Backups",
      desc: "Real-time replica clusters guarantee a 99.9% uptime metric, securing practice continuous delivery."
    }
  ]

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-28 pb-14 text-center">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
            <ShieldCheck className="h-4 w-4 text-[#0D9F8C]" />
            Enterprise Protection Posture
          </div>
          <h1 className="font-sans text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#081b36] md:text-6xl lg:text-7xl">
            Sovereign Australian data. <br />
            <span className="font-serif font-normal text-[#0D9F8C] italic">Uncompromising compliance.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600 font-medium">
            ImmiSign delivers the bank-grade infrastructure needed to secure migration client matters and protect sensitive identity documents.
          </p>
        </div>
      </section>

      {/* Grid of Security Pillars */}
      <section className="py-24">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pil) => (
              <Card key={pil.title} className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] shadow-sm mb-6">
                  <pil.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[#081b36]">{pil.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 font-semibold">{pil.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance / Privacy Section */}
      <section className="bg-[#f9fbf9] py-24 border-y border-slate-100">
        <div className="container mx-auto max-w-[1000px] px-6 text-center">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-[#081b36] md:text-4xl">
            Strictly aligned with the <span className="italic text-[#0D9F8C]">Privacy Act 1988.</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-slate-500 font-semibold leading-relaxed text-sm md:text-base">
            Migration agents manage critical applicant histories, passport records, family structures, and finances. ImmiSign provides OMARA-level data preservation records out of the box.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {["Sovereign Hosted", "Strict TLS 1.3", "MFA Mandatory", "Hourly Backups"].map((tag) => (
              <div key={tag} className="rounded-xl border border-emerald-100 bg-white p-4 font-bold text-[#0A5B52] shadow-sm text-xs uppercase tracking-wider">
                {tag}
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
    // Simulate API Intake lookup
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1500)
  }

  return (
    <div className="bg-white text-[#081B2E] antialiased">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_top_right,rgba(13,159,140,0.12),transparent_38%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_92%)] pt-28 pb-14 text-center">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-[#0A5B52] shadow-sm mb-6">
            <MessageSquare className="h-4 w-4 text-[#0D9F8C]" />
            Connect with Legal-Tech Advisors
          </div>
          <h1 className="font-sans text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#081b36] md:text-6xl lg:text-7xl">
            We are here to support <br />
            <span className="font-serif font-normal text-[#0D9F8C] italic">your practice.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600 font-medium">
            Have structural OMARA questions, custom document library integrations, or need dedicated agency onboarding? Connect with our Sydney-based specialist team.
          </p>
        </div>
      </section>

      {/* Main Form and Location Side panel */}
      <section className="py-24">
        <div className="container mx-auto max-w-[1200px] px-6 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Intake Card */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            {isSubmitted ? (
              <div className="text-center py-12 animate-enter">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] mb-6">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#081b36]">Request Submitted Successfully</h3>
                <p className="mt-3 text-sm text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
                  Thanks for reaching out, {formData.name}! A Sydney-based onboarding advisor has received your agency profile request and will contact you within the next 2 business hours.
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
                  className="mt-8 bg-[#0D9F8C] hover:bg-[#0A5B52] rounded-xl font-bold"
                >
                  Submit another inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-[#081b36]">Intake Contact Form</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Please provide operational details to route your inquiry to the correct domestic advisor.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Full Name</label>
                    <Input
                      required
                      placeholder="e.g. Rajwant Singh"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-11 rounded-xl border-slate-200/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Email Address</label>
                    <Input
                      required
                      type="email"
                      placeholder="e.g. rajwant@australisvisa.com.au"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-11 rounded-xl border-slate-200/80"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Agency Name</label>
                    <Input
                      required
                      placeholder="e.g. Australis Visa Partners"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="h-11 rounded-xl border-slate-200/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">MARN (Registered Agents Only)</label>
                    <Input
                      placeholder="7-digit MARN identifier"
                      value={formData.marn}
                      onChange={(e) => setFormData({ ...formData, marn: e.target.value })}
                      className="h-11 rounded-xl border-slate-200/80"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Practitioner Count</label>
                    <select
                      value={formData.practitioners}
                      onChange={(e) => setFormData({ ...formData, practitioners: e.target.value })}
                      className="flex h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-[#081b36] focus:outline-none focus:ring-2 focus:ring-[#0D9F8C]"
                    >
                      <option value="1">Solo Practitioner (1 RMA)</option>
                      <option value="2-5">2 to 5 Practitioners</option>
                      <option value="6-15">6 to 15 Practitioners</option>
                      <option value="16+">16+ Practitioners / Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Milestone Volume</label>
                    <select
                      value={formData.throughput}
                      onChange={(e) => setFormData({ ...formData, throughput: e.target.value })}
                      className="flex h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-[#081b36] focus:outline-none focus:ring-2 focus:ring-[#0D9F8C]"
                    >
                      <option value="under-50">Under 50 agreements/month</option>
                      <option value="50-150">50 to 150 agreements/month</option>
                      <option value="150+">150+ agreements/month</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Inquiry details</label>
                  <textarea
                    required
                    placeholder="Describe your practice onboarding, data migration, or compliance needs..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="flex min-h-[120px] w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-[#081b36] focus:outline-none focus:ring-2 focus:ring-[#0D9F8C]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-[#0D9F8C] hover:bg-[#0A5B52] font-bold shadow-[0_12px_24px_rgba(13,159,140,0.15)] transition-all duration-300"
                >
                  {isSubmitting ? "Submitting Inquiry..." : "Submit Practice Request"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4 ml-1" />}
                </Button>
              </form>
            )}
          </Card>

          {/* Location Sidepanel */}
          <div className="flex flex-col justify-between py-2">
            <div className="space-y-8">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Our Office</span>
                <h4 className="font-serif text-3xl text-[#081b36] mt-2">Sydney HQ</h4>
                <p className="mt-2 text-sm text-slate-500 font-semibold leading-relaxed">
                  Level 14, 175 Pitt Street <br />
                  Sydney NSW 2000, Australia
                </p>
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Advising Hours</span>
                <p className="mt-2 text-sm text-slate-500 font-semibold leading-relaxed">
                  <strong>Monday – Friday:</strong> 8:30 AM – 6:00 PM AEST <br />
                  <strong>Weekend:</strong> Emergency backup operations support.
                </p>
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0D9F8C]">Direct Contacts</span>
                <p className="mt-2 text-sm text-slate-500 font-semibold leading-relaxed">
                  <strong>Sales Inquiry:</strong> hello@immisign.com.au <br />
                  <strong>Practice Support:</strong> support@immisign.com.au <br />
                  <strong>Call center:</strong> +61 (02) 8005 7416
                </p>
              </div>
            </div>

            <div className="mt-12 rounded-2xl bg-gradient-to-br from-[#021815] to-[#000504] p-6 text-white shadow-sm border border-emerald-950">
              <ShieldCheck className="h-8 w-8 text-[#33C48D]" />
              <h4 className="text-lg font-bold mt-4">100% On-shore Delivery</h4>
              <p className="text-xs text-emerald-100/70 leading-relaxed font-semibold mt-2">
                All client databases, document attachments, development iterations, and operational support are kept fully within Australia for absolute structural privacy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

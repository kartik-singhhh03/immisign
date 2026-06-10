import {
  Check,
  Download,
  Mail,
  Phone,
  Search,
  Shield,
  User,
  UserRound,
  Lock,
} from "lucide-react"

import {
  PrimaryMarketingButton,
  SecondaryMarketingButton,
  TextLinkArrow,
} from "@/components/marketing/MarketingButtons"
import { ComplianceStatsBar } from "@/components/marketing/ComplianceStatsBar"
import { MarketingHero } from "@/components/marketing/MarketingHero"
import { WorkflowTimeline } from "@/components/marketing/WorkflowTimeline"

const FILE_NOTE_BULLETS = [
  "Append-only. Never editable. Never deletable.",
  "Server timestamped and agent identified.",
  "Organised by client and note type.",
  "Exportable for audit at any time.",
]

const NOTE_FILTERS = ["All", "Phone Call", "Email", "Attendance", "Advice", "Internal"]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">
      {children}
    </p>
  )
}

function FileNotesMockup() {
  const notes = [
    {
      type: "Phone Call",
      icon: Phone,
      iconBg: "bg-[#E8F3EE] text-mate-accent",
      author: "Rajwant Singh",
      time: "6 Jun 2025 at 07:41 pm",
      body: "Called client to confirm TRA assessment has been lodged. Client advised passport is expiring in October — reminded to renew before lodgement.",
    },
    {
      type: "Email",
      icon: Mail,
      iconBg: "bg-[#FEF3C7] text-[#B45309]",
      author: "Rajwant Singh",
      time: "6 Jun 2025 at 07:41 pm",
      body: "Forwarded state nomination invitation letter to client. Advised client to not travel interstate before application is lodged.",
    },
    {
      type: "Attendance",
      icon: UserRound,
      iconBg: "bg-[#EDE9FE] text-[#6D28D9]",
      author: "Rajwant Singh",
      time: "6 Jun 2025 at 07:20 pm",
      body: "Client attended office to sign authorised form 956. Provided updated documents.",
    },
  ]

  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-mate-grey/80" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border border-mate-border bg-white shadow-[0_20px_50px_rgba(17,17,17,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mate-border px-6 py-5">
          <p className="text-sm font-semibold text-mate-primary">File Notes</p>
          <div className="flex flex-1 items-center justify-end gap-3 sm:max-w-md">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-mate-border bg-mate-offwhite px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-mate-muted" />
              <span className="truncate text-xs text-mate-muted">Search notes...</span>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-mate-primary px-4 py-2 text-[11px] font-semibold text-white"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Export for Audit
            </button>
          </div>
        </div>

        <div className="border-b border-mate-border px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {NOTE_FILTERS.map((f, i) => (
              <span
                key={f}
                className={`rounded-full px-3.5 py-1.5 text-[10px] font-semibold ${
                  i === 0
                    ? "bg-mate-accent text-white"
                    : "bg-mate-grey text-mate-muted"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="divide-y divide-mate-border">
          {notes.map((note) => {
            const Icon = note.icon
            return (
              <div key={`${note.type}-${note.time}`} className="px-6 py-5">
                <div className="flex gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${note.iconBg}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[11px] font-semibold text-mate-primary">
                        {note.type}
                      </span>
                      <span className="text-[11px] text-mate-muted">·</span>
                      <span className="text-[11px] font-medium text-mate-secondary">
                        {note.author}
                      </span>
                      <span className="text-[11px] text-mate-muted">·</span>
                      <span className="text-[11px] text-mate-muted">{note.time}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-mate-secondary">
                      {note.body}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function MarketingPage() {
  return (
    <div className="flex w-full flex-col">
      <MarketingHero />

      {/* ── Workflow ── */}
      <section id="workflow" className="app-grain bg-[#F9F9F9] py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="text-center">
            <SectionLabel>The ImmiMate workflow</SectionLabel>
            <h2 className="mt-4 font-display text-[2.25rem] font-normal tracking-[-0.03em] text-mate-primary md:text-[3.25rem] lg:text-[3.75rem]">
              A complete compliance journey.
            </h2>
          </div>
          <WorkflowTimeline />
        </div>
      </section>

      {/* ── File Notes ── */}
      <section className="border-y border-mate-border bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <SectionLabel>File Notes</SectionLabel>
              <h2 className="mt-4 font-display text-[2.25rem] font-normal leading-[1.1] tracking-[-0.03em] text-mate-primary md:text-[3rem] lg:text-[3.5rem]">
                <span className="block">Every conversation.</span>
                <span className="block">
                  Captured{" "}
                  <span className="italic text-mate-accent">forever.</span>
                </span>
              </h2>
              <ul className="mt-10 space-y-4">
                {FILE_NOTE_BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-mate-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mate-accent/30 bg-mate-accent/[0.08]">
                      <Check className="h-3 w-3 text-mate-accent" strokeWidth={2.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <TextLinkArrow href="/features#file-notes" className="underline decoration-mate-accent/40 underline-offset-4">
                  Explore File Notes
                </TextLinkArrow>
              </div>
            </div>
            <FileNotesMockup />
          </div>
        </div>
      </section>

      {/* ── Compliance Stats Bar ── */}
      <section className="bg-[#F9F9F9] py-16 md:py-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <ComplianceStatsBar />
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="border-t border-mate-border bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-20">
            <div>
              <h2 className="font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.03em] text-mate-primary md:text-[2.75rem] lg:text-[3.25rem]">
                Built for migration practices that value{" "}
                <span className="italic text-mate-accent">compliance.</span>
              </h2>
              <div className="mt-6 h-0.5 w-12 bg-mate-accent" aria-hidden />
            </div>

            <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {[
                {
                  icon: Lock,
                  title: "Secure by design",
                  desc: "Your data is encrypted, protected and backed by enterprise-grade infrastructure.",
                },
                {
                  icon: Shield,
                  title: "Built for OMARA",
                  desc: "Designed specifically for registered migration agents and Australian compliance obligations.",
                },
                {
                  icon: User,
                  title: "Trusted by professionals",
                  desc: "Used by migration agents who take compliance, documentation and client care seriously.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <item.icon className="h-5 w-5 text-mate-muted" strokeWidth={1.5} />
                  <h3 className="mt-5 text-[15px] font-semibold text-mate-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-[1.65] text-mate-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="bg-[#F9F9F9] px-6 py-16 md:py-24">
        <div className="container mx-auto max-w-[1400px]">
          <div className="flex flex-col items-start justify-between gap-10 rounded-[2rem] bg-[#1a1a1a] px-8 py-12 text-white md:flex-row md:items-center md:px-14 md:py-14">
            <div className="max-w-lg">
              <h2 className="font-display text-[2rem] font-normal leading-[1.1] tracking-[-0.03em] md:text-[2.5rem]">
                Experience ImmiMate for your practice.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/55">
                Book a personalised demo and see how ImmiMate connects every compliance workflow to
                the client.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <PrimaryMarketingButton href="/contact">Book a Demo</PrimaryMarketingButton>
              <SecondaryMarketingButton href="#workflow" variant="dark">
                See the Workflow
              </SecondaryMarketingButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

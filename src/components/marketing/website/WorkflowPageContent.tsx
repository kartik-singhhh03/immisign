"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { PrimaryMarketingButton } from "@/components/marketing/MarketingButtons"
import { WorkflowTimeline } from "@/components/marketing/WorkflowTimeline"

const PROCESS_STEPS = [
  { title: "Inquiry", desc: "Capture leads and initial client interest." },
  { title: "Onboarding", desc: "Collect details, matter context, and compliance disclosures." },
  { title: "Matter Setup", desc: "Configure visa stream, fees, and responsible RMA." },
  { title: "Agreement", desc: "Generate OMARA-ready service agreements and dispatch for signature." },
  { title: "Compliance", desc: "File notes, obligations, and practice visibility in one place." },
  { title: "Approval", desc: "Internal review and client sign-off with certificates." },
  { title: "Lodgement", desc: "Track lodgement status and completion records." },
]

export function WorkflowPageContent() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-20 md:pt-36 md:pb-24">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Workflow</p>
          <h1 className="mt-6 max-w-3xl font-display text-[2.75rem] font-normal leading-[1.08] tracking-[-0.035em] text-mate-primary md:text-6xl">
            From inquiry to lodgement — one connected journey.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mate-muted">
            ImmiMate maps every compliance step to the client record. No disconnected spreadsheets. No missing audit trails.
          </p>
          <div className="mt-10">
            <PrimaryMarketingButton href="/book-demo">Book a Demo</PrimaryMarketingButton>
          </div>
        </div>
      </section>

      <section className="app-grain bg-[#F9F9F9] py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <WorkflowTimeline />
        </div>
      </section>

      <section className="border-y border-mate-border bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <h2 className="text-center font-display text-3xl font-normal tracking-[-0.03em] text-mate-primary md:text-4xl">
            Seven stages. Zero gaps.
          </h2>
          <div className="mt-14 space-y-4">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="flex items-start gap-6 rounded-2xl border border-mate-border bg-mate-offwhite p-6 md:p-8"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mate-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-mate-primary">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-mate-muted">{step.desc}</p>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <ArrowRight className="ml-auto hidden h-5 w-5 shrink-0 text-mate-muted md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F9F9F9] px-6 py-16 md:py-24">
        <div className="container mx-auto max-w-[1400px] text-center">
          <p className="text-mate-muted">See how each module supports the workflow.</p>
          <Link
            href="/features"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-mate-accent hover:underline"
          >
            Explore features <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

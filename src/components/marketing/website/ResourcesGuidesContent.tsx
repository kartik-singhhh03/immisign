"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"

import { GUIDES } from "@/lib/marketing/content"

export function ResourcesGuidesContent() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-16 md:pt-36">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Guides</p>
          <h1 className="mt-6 font-display text-[2.75rem] font-normal text-mate-primary md:text-5xl">
            Migration practice guides
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-mate-muted">
            Step-by-step playbooks for agreements, compliance, and team setup.
          </p>
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-16 md:py-24">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/resources/guides#${guide.slug}`}
                className="rounded-2xl border border-mate-border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <BookOpen className="h-5 w-5 text-mate-accent" />
                <h2 className="mt-4 text-lg font-semibold text-mate-primary">{guide.title}</h2>
                <p className="mt-2 text-sm text-mate-muted">{guide.description}</p>
                <p className="mt-4 text-xs font-semibold text-mate-muted">
                  {guide.level} · {guide.duration}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

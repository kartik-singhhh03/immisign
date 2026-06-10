"use client"

import Link from "next/link"
import { MapPin, Briefcase } from "lucide-react"

const ROLES = [
  {
    title: "Senior Full-Stack Engineer",
    location: "Sydney / Remote (AU)",
    type: "Full-time",
    team: "Product",
  },
  {
    title: "Customer Success Manager",
    location: "Sydney",
    type: "Full-time",
    team: "Customer",
  },
  {
    title: "Compliance Product Designer",
    location: "Remote (AU)",
    type: "Contract",
    team: "Design",
  },
]

export function CareersPageContent() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-20 md:pt-36">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Careers</p>
          <h1 className="mt-6 max-w-3xl font-display text-[2.75rem] font-normal leading-[1.08] text-mate-primary md:text-6xl">
            Help migration practices stay audit-ready.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mate-muted">
            We are building compliance infrastructure for Australian migration agents. Join a small, focused team obsessed with quality.
          </p>
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-20 md:py-28">
        <div className="container mx-auto max-w-[1400px] px-6">
          <h2 className="text-xl font-semibold text-mate-primary">Open roles</h2>
          <div className="mt-8 space-y-4">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="flex flex-col gap-4 rounded-2xl border border-mate-border bg-white p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-mate-primary">{role.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-mate-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {role.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" /> {role.type} · {role.team}
                    </span>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-mate-border px-5 text-sm font-semibold text-mate-primary hover:bg-mate-offwhite"
                >
                  Apply
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-mate-muted">
            Don&apos;t see a fit?{" "}
            <Link href="/contact" className="font-semibold text-mate-accent hover:underline">
              Get in touch
            </Link>{" "}
            — we are always interested in exceptional people.
          </p>
        </div>
      </section>
    </div>
  )
}

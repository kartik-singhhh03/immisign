"use client"

import * as React from "react"
import { CheckCircle2, Calendar } from "lucide-react"

import { PrimaryMarketingButton } from "@/components/marketing/MarketingButtons"
import { Input } from "@/components/ui/input"

type FormState = {
  name: string
  agency: string
  email: string
  phone: string
  teamSize: string
  message: string
}

const EMPTY: FormState = {
  name: "",
  agency: "",
  email: "",
  phone: "",
  teamSize: "",
  message: "",
}

export function BookDemoPageContent() {
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = "Name is required"
    if (!form.agency.trim()) next.agency = "Agency name is required"
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Valid email is required"
    }
    if (!form.teamSize.trim()) next.teamSize = "Team size is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitting(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-32">
        <div className="max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-mate-accent" />
          <h1 className="mt-6 font-display text-3xl text-mate-primary">Demo request received</h1>
          <p className="mt-4 text-mate-muted">
            Thank you, {form.name}. Our team will contact you at {form.email} within one business day.
          </p>
          <div className="mt-8">
            <PrimaryMarketingButton href="/">Back to home</PrimaryMarketingButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-16 md:pt-36">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Book a demo</p>
          <h1 className="mt-6 max-w-2xl font-display text-[2.75rem] font-normal leading-[1.08] tracking-[-0.035em] text-mate-primary md:text-5xl">
            See ImmiMate in action.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-mate-muted">
            Walk through agreements, file notes, approvals, and compliance — tailored to your practice.
          </p>
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-16 md:py-24">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-mate-border bg-white p-8 shadow-sm md:p-10"
              noValidate
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Name" error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label="Agency" error={errors.agency}>
                  <Input
                    value={form.agency}
                    onChange={(e) => setForm({ ...form, agency: e.target.value })}
                    aria-invalid={Boolean(errors.agency)}
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Team size" error={errors.teamSize} className="sm:col-span-2">
                  <Input
                    placeholder="e.g. 3 agents, 2 staff"
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                    aria-invalid={Boolean(errors.teamSize)}
                  />
                </Field>
                <Field label="Message" className="sm:col-span-2">
                  <textarea
                    className="min-h-[120px] w-full rounded-xl border border-mate-border bg-white px-4 py-3 text-sm outline-none ring-mate-accent/20 focus:ring-2"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about your practice and what you'd like to see..."
                  />
                </Field>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-mate-primary px-8 text-sm font-semibold text-white transition-opacity hover:bg-mate-charcoal disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Request Demo"}
              </button>
            </form>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-mate-border bg-white p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-mate-accent" />
                  <h2 className="font-semibold text-mate-primary">Calendly</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-mate-muted">
                  Prefer to pick a time? Calendly scheduling will be embedded here. For now, submit the form and we will confirm a slot.
                </p>
                <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-mate-border bg-mate-offwhite text-xs text-mate-muted">
                  Calendly embed placeholder
                </div>
              </div>
              <p className="text-xs text-mate-muted">
                By submitting, you agree to our{" "}
                <a href="/privacy" className="underline hover:text-mate-primary">
                  Privacy Policy
                </a>
                .
              </p>
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-mate-muted">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}

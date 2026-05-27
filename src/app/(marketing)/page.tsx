import Image from "next/image"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSignature,
  FileText,
  FolderOpen,
  Globe2,
  Library,
  LineChart,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const trustItems = [
  { label: "MARA", detail: "Migration Agents Registration Authority" },
  { label: "MAAA", detail: "Migration Alliance Australia" },
  { label: "PIER", detail: "Professional Indemnity Insurance" },
]

const assuranceItems = [
  { icon: FileSignature, label: "MARA-Compliant Templates" },
  { icon: LockKeyhole, label: "Secure & Private" },
  { icon: Globe2, label: "Australian Data Hosted" },
]

const features = [
  {
    icon: FileText,
    title: "MARA-Compliant Agreements",
    desc: "Pre-built clauses and smart templates that keep every agreement consistent and compliant.",
  },
  {
    icon: FileSignature,
    title: "E-Signature Workflows",
    desc: "Send agreements and documents for signature in seconds with clear status tracking.",
  },
  {
    icon: FolderOpen,
    title: "Migration Document Library",
    desc: "Store, reuse and manage approved templates and client documents from one place.",
  },
  {
    icon: Users,
    title: "Multi-RMA Support",
    desc: "Collaborate with your team securely, with role-based access for every user.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    desc: "Enterprise-grade controls protect your clients, your documents, and your practice.",
  },
  {
    icon: BarChart3,
    title: "Reports & Insights",
    desc: "Track performance, agreements, signatures and team productivity with confidence.",
  },
]

const stats = [
  { icon: Users, value: "500+", label: "Migration Professionals" },
  { icon: FileSignature, value: "10,000+", label: "Agreements Signed" },
  { icon: Library, value: "50,000+", label: "Documents Managed" },
  { icon: ShieldCheck, value: "99.9%", label: "Uptime Guarantee" },
]

const testimonials = [
  {
    quote:
      "ImmiSign has transformed how we manage agreements and documents. It is secure, compliant and built exactly for what we do.",
    author: "Simran Kaur",
    role: "Registered Migration Agent",
  },
  {
    quote:
      "Finally, a platform that understands migration professionals. The document library and e-signature flows save us hours every week.",
    author: "Jaspreet Singh",
    role: "Director, Visa Success",
  },
  {
    quote:
      "The MARA-compliant templates give us confidence that every agreement meets the required standards.",
    author: "Neha Sharma",
    role: "Migration Agent",
  },
]

export default function MarketingPage() {
  return (
    <div className="flex w-full flex-col bg-white font-sans text-[#07172f] antialiased">
      <section className="relative overflow-hidden border-b border-emerald-900/5 bg-[radial-gradient(circle_at_78%_10%,rgba(13,159,140,0.15),transparent_38%),radial-gradient(circle_at_8%_20%,rgba(51,196,141,0.06),transparent_32%),linear-gradient(180deg,#f3fcf9_0%,#ffffff_85%)] pt-22 pb-10">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(90deg,rgba(13,159,140,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(13,159,140,0.05)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45" />
        <div className="container relative mx-auto grid max-w-[1400px] gap-12 px-6 pb-12 pt-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:pb-16">
          <div className="animate-enter max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/60 bg-white/[0.85] px-4 py-2 text-xs font-black tracking-[-0.01em] text-[#0A5B52] shadow-[0_12px_28px_rgba(13,159,140,0.06)] backdrop-blur-xl">
              <span className="text-[10px] font-black leading-none text-white bg-[#0D9F8C] px-1.5 py-0.5 rounded-md">AU</span>
              Built exclusively for Australian Migration Agents
            </div>

            <h1 className="mt-5 font-sans text-5xl font-extrabold leading-[1.02] tracking-[-0.04em] text-[#081b36] md:text-7xl">
              E-sign. Manage.<br />
              <span className="font-serif font-normal text-[#0D9F8C] tracking-[-0.025em] text-[0.92em]">Grow your practice.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base md:text-lg leading-7 text-slate-600 font-medium">
              ImmiSign is the only end-to-end e-signature and document platform
              built for migration professionals. MARA-compliant. Purpose-built.
              Nothing generic.
            </p>

            <div className="mt-7 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-[#0D9F8C] px-8 font-bold shadow-[0_18px_36px_rgba(13,159,140,0.22)] transition-all duration-300 hover:bg-[#0A5B52] hover:shadow-[0_22px_40px_rgba(13,159,140,0.30)] hover:-translate-y-0.5"
              >
                Start 14-Day Free Trial
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white/[0.80] px-8 font-bold text-[#0A5B52] shadow-sm transition-all duration-300 hover:bg-emerald-50/50 hover:border-slate-350 hover:-translate-y-0.5"
              >
                Book a Demo
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-slate-500">
              {[
                "No credit card required",
                "Setup in 2 minutes",
                "Cancel anytime",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#0D9F8C]" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
              <ShieldCheck className="h-5 w-5 text-[#0D9F8C]" />
              Trusted by migration professionals across Australia
            </div>
          </div>

          <div className="animate-enter relative min-w-0">
            <div className="absolute -inset-6 rounded-[2rem] bg-[#0D9F8C]/8 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-white bg-white shadow-[0_34px_90px_rgba(10,91,82,0.15),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1">
              <Image
                src="/images/demo_dashboard.png"
                alt="ImmiSign demo dashboard showing agreements, signature status and document analytics"
                width={1764}
                height={1012}
                priority
                className="h-auto w-full max-w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/70 bg-white py-12">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-center text-base font-semibold text-slate-700">
            Built for compliance. Trusted by the profession.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3 lg:grid-cols-6">
            {trustItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-white/[0.80] p-4 shadow-sm">
                <div className="text-2xl font-black tracking-tight text-[#172b6d]">
                  {item.label}
                </div>
                <div className="text-xs font-semibold leading-tight text-slate-500">
                  {item.detail}
                </div>
              </div>
            ))}
            {assuranceItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 border-slate-200 lg:border-l lg:pl-6"
              >
                <item.icon className="h-8 w-8 text-[#0D9F8C]" />
                <span className="text-sm font-bold leading-tight text-[#0A5B52]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <h2 className="mx-auto max-w-4xl text-center text-4xl font-serif font-normal leading-[1.08] tracking-[-0.03em] text-[#081a36] md:text-5xl lg:text-6xl">
            Everything you need to run a <span className="italic text-[#0D9F8C]">compliant</span>, efficient and modern migration practice.
          </h2>
          <div className="stagger-children mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group rounded-[1.35rem] border-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-elevated bg-white"
              >
                <CardContent className="flex h-full flex-col items-center p-7 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0D9F8C] shadow-[0_12px_28px_rgba(13,159,140,0.06)] transition-all duration-300 group-hover:bg-[#0D9F8C] group-hover:text-white">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 min-h-[48px] text-base font-bold leading-tight text-[#081a36]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500 font-medium">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[radial-gradient(circle_at_12%_0%,rgba(51,196,141,0.18),transparent_26%),linear-gradient(135deg,#0A5B52,#06302b)] py-14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-4">
                <stat.icon className="h-10 w-10 text-white/80" />
                <div>
                  <div className="text-3xl font-black leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-emerald-100/80">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <h2 className="text-center text-4xl font-serif font-normal tracking-[-0.03em] text-[#081a36] md:text-5xl">
            Trusted by <span className="italic text-[#0D9F8C]">migration professionals</span>
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card
                key={item.author}
                className="rounded-[1.35rem] border-white/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200/60"
              >
                <CardContent className="p-8">
                  <div className="text-4xl font-serif italic leading-none text-emerald-100/80">
                    &ldquo;
                  </div>
                  <p className="mt-2 min-h-[96px] text-sm leading-7 text-slate-600 font-medium">
                    {item.quote}
                  </p>
                  <div className="mt-7 flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-slate-50 text-sm font-black text-[#0D9F8C] border border-emerald-100/50">
                      {item.author
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="font-bold text-[#081a36]">
                        {item.author}
                      </div>
                      <div className="text-sm text-slate-400 font-semibold">{item.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#0D9F8C]" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
          </div>
        </div>
      </section>

      <section className="bg-white pb-24 md:pb-32">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="flex flex-col items-center justify-between gap-8 rounded-[2rem] border border-emerald-100/70 bg-[radial-gradient(circle_at_12%_0%,rgba(51,196,141,0.12),transparent_28%),linear-gradient(90deg,#e9fbf5_0%,#f7fffd_100%)] px-8 py-10 shadow-[0_22px_64px_rgba(13,159,140,0.06)] md:flex-row md:px-14">
            <div className="flex items-center gap-6">
              <div className="hidden h-20 w-20 items-center justify-center rounded-2xl bg-white text-[#0D9F8C] shadow-sm sm:flex border border-emerald-50">
                <Sparkles className="h-10 w-10 text-[#0D9F8C]" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-normal tracking-tight text-[#081a36] md:text-3xl">
                  Ready to simplify your <span className="italic text-[#0D9F8C]">migration practice?</span>
                </h2>
                <p className="mt-2 text-slate-500 font-medium text-sm md:text-base">
                  Start your 14-day free trial. No credit card required.
                </p>
              </div>
            </div>
            <Button className="h-12 rounded-xl bg-[#0D9F8C] px-9 font-bold shadow-[0_12px_28px_rgba(13,159,140,0.18)] transition-all duration-300 hover:bg-[#0A5B52] hover:shadow-[0_16px_32px_rgba(13,159,140,0.28)] hover:-translate-y-0.5">
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-[#F7FAF8] py-14">
        <div className="container mx-auto grid max-w-[1400px] gap-6 px-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "Fast setup", text: "Go from account to first agreement in minutes." },
            { icon: Send, title: "Fewer follow-ups", text: "Clear workflows keep signatures and documents moving." },
            { icon: LineChart, title: "Practice visibility", text: "Know what is sent, signed, pending and overdue." },
          ].map((item) => (
            <div key={item.title} className="premium-card flex gap-4 rounded-2xl border-white/70 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0D9F8C] shadow-sm">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-[#081a36]">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

import {
  Check,
  FileText,
  FolderOpen,
  ShieldCheck,
  User,
} from "lucide-react"

const STATS = [
  {
    icon: FileText,
    value: "12",
    label: "Missing Agreements",
    sub: "Require attention",
  },
  {
    icon: ShieldCheck,
    value: "8",
    label: "Pending Approvals",
    sub: "Awaiting client sign-off",
  },
  {
    icon: FolderOpen,
    value: "15",
    label: "Outstanding Documents",
    sub: "Still to be collected",
  },
  {
    icon: User,
    value: "5",
    label: "Unacknowledged SOS",
    sub: "Awaiting acknowledgement",
  },
  {
    icon: Check,
    value: "98%",
    label: "Audit Readiness",
    sub: "Excellent",
    highlight: true,
  },
]

export function ComplianceStatsBar() {
  return (
    <div className="rounded-[1.75rem] bg-[#0A0A0A] px-6 py-8 md:px-10 md:py-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-white/10">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center lg:px-6 first:lg:pl-0 last:lg:pr-0"
            >
              {stat.highlight ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mate-accent">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
              )}
              <p className="mt-4 font-display text-4xl font-normal tracking-[-0.03em] text-white md:text-[2.75rem]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-white">{stat.label}</p>
              <p
                className={`mt-1 text-xs ${
                  stat.highlight ? "font-semibold text-mate-accent" : "text-white/45"
                }`}
              >
                {stat.sub}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

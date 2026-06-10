import Link from "next/link"
import { ShieldCheck, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/brand/Logo"
import { APP_TAGLINE } from "@/lib/brand"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      <div className="relative hidden w-1/2 flex-col justify-between bg-mate-primary p-12 text-white lg:flex xl:w-[45%]">
        <div className="relative z-10">
          <Logo href="/" width={160} variant="light" />
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <h1 className="mb-4 font-serif text-4xl font-normal leading-tight tracking-[-0.03em] text-white">
              Compliance Proof
              <span className="block italic text-white/75">Your Practice.</span>
            </h1>
            <p className="max-w-md text-base font-normal leading-relaxed text-white/55">
              {APP_TAGLINE}. The compliance operating system for Australian migration
              practices — every workflow connected to the client.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {[
              "Client-centric compliance workflow",
              "Append-only File Notes audit trail",
              "Application Approval with certificate storage",
            ].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <CheckCircle2 className="h-5 w-5 text-mate-accent" />
                </div>
                <p className="text-sm font-medium text-white/80">{item}</p>
              </div>
            ))}
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <ShieldCheck className="h-5 w-5 text-mate-accent" />
              </div>
              <p className="text-sm font-medium text-white/80">Australian data hosted</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-8 text-sm text-white/40">
          <p>© {new Date().getFullYear()} ImmiMate</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-mate-offwhite px-6 py-12 lg:w-1/2 xl:w-[55%]">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

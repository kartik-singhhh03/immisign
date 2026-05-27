import Link from "next/link"
import { ShieldCheck, CheckCircle2 } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      {/* Left side: Premium Branding Panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0A3D36] p-12 text-white lg:flex xl:w-[45%]">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#0D9F8C]/20 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#0D9F8C]/10 blur-[120px]" />
          <div className="absolute left-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        </div>
        
        <div className="relative z-10 flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#0A3D36] shadow-subtle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight">ImmiSign</span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-4">
              Enter the new era of migration practice.
            </h1>
            <p className="text-lg font-medium text-emerald-100/70 leading-relaxed max-w-md">
              Secure, compliant, and elegantly automated. Elevate your client experience with enterprise-grade document management.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-[#0D9F8C]" />
              </div>
              <p className="text-sm font-semibold text-emerald-50">MARA-Compliant Infrastructure</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-[#0D9F8C]" />
              </div>
              <p className="text-sm font-semibold text-emerald-50">Enterprise-Grade Multi-RMA Security</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#0D9F8C]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <p className="text-sm font-semibold text-emerald-50">Secure E-Signatures & Document Vault</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-emerald-800/50 pt-8 text-sm font-medium text-emerald-200/50">
          <p>© 2026 MARA Australian Migration.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 xl:w-[55%]">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}

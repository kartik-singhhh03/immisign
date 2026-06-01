import { notFound } from 'next/navigation';

export default async function ClientSignPortal({ params }: { params: { token: string } }) {
  // 1. In a future implementation, this token would map to an `agreement_signatures` record.
  // 2. We would resolve the `signwell_signer_id` and the `signing_url`.
  // 3. We could embed the signing UI directly in an iframe, or redirect them.
  
  if (!params.token) return notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center border border-slate-100">
        <div className="mx-auto w-16 h-16 bg-[#0D9F8C]/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-[#0D9F8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[#081B2E] tracking-tight">ImmiSign Portal</h1>
        <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
          This secure link will allow you to electronically sign your immigration agreement. The full signing portal interface is currently in development.
        </p>
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-400 break-all">
          Token: {params.token}
        </div>
      </div>
    </div>
  );
}

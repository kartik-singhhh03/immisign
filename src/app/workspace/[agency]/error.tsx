"use client"

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm border border-red-100">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 font-medium">
        We encountered an error while trying to render this section. 
        Don't worry, your data is safe.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[#0D9F8C] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A8777] shadow-sm"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm"
        >
          Go back home
        </button>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D9F8C] border-t-transparent" />
      <p className="text-sm font-bold text-slate-500">Loading documents...</p>
    </div>
  )
}

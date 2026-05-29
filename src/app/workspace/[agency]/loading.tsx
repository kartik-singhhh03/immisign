export default function WorkspaceLoading() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0D9F8C] opacity-20"></span>
        <span className="relative inline-flex h-8 w-8 rounded-full bg-[#0D9F8C]"></span>
      </div>
      <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest motion-safe:animate-pulse">Loading workspace...</p>
    </div>
  )
}

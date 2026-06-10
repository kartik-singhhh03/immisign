/**
 * ImmiMate UI standards — single source for repeated Tailwind class strings.
 * Use these instead of inventing new paddings/radii per page.
 */

export const ui = {
  page: 'animate-enter space-y-6',
  pageHeaderEyebrow: 'page-eyebrow',
  pageTitle: 'page-title',
  pageDescription: 'page-description',
  sectionTitle: 'section-title',

  card: 'rounded-2xl border border-slate-200/60 bg-white shadow-sm',
  cardPadding: 'p-6 sm:p-8',

  input:
    'h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#111111]',
  textarea:
    'min-h-[100px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#111111]',
  label: 'text-[11px] font-bold uppercase tracking-wide text-slate-500',

  btnPrimary: 'rounded-xl bg-[#111111] font-bold hover:bg-[#222222] text-white',
  btnSecondary: 'rounded-xl border-slate-200 bg-white font-bold',
  btnDestructive: 'rounded-xl font-bold',

  tableWrap: 'rounded-2xl border border-slate-200/50 overflow-hidden bg-white immimate-scroll',
  tableHead:
    'border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider',
  tableRow: 'hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0',

  scrollRegion: 'immimate-scroll overflow-auto',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2',
} as const;

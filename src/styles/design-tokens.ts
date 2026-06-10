/** ImmiMate global design tokens — single source of truth for UI unification */

export const colors = {
  black: '#111111',
  charcoal: '#1B1B1B',
  graphite: '#2B2B2B',
  slate: '#5C5C5C',
  border: '#E7E7E7',
  surface: '#FAFAFA',
  white: '#FFFFFF',
  success: '#111111',
  hover: '#222222',
  secondary: '#1C1C1C',
  danger: '#B91C1C',
  dangerMuted: '#991B1B',
} as const

export const typography = {
  fontDisplay: 'var(--font-instrument), "Instrument Serif", Georgia, serif',
  fontBody: 'var(--font-geist), "Geist", "Inter", system-ui, sans-serif',
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  h1: 'font-display text-3xl font-semibold tracking-tight text-[#111111]',
  h2: 'font-display text-2xl font-semibold tracking-tight text-[#111111]',
  section: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]',
  label: 'text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]',
  body: 'text-sm font-medium text-[#1C1C1C]',
  caption: 'text-xs font-medium text-[#5C5C5C]',
} as const

export const radius = {
  button: '12px',
  card: '12px',
  input: '12px',
} as const

export const motion = {
  fast: '150ms',
  normal: '200ms',
  slow: '250ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const shadow = {
  card: '0 1px 3px rgba(17, 17, 17, 0.06), 0 8px 24px rgba(17, 17, 17, 0.04)',
  button: '0 1px 2px rgba(17, 17, 17, 0.08)',
} as const

export const table = {
  rowHeight: '48px',
  cellPadding: '12px 16px',
} as const

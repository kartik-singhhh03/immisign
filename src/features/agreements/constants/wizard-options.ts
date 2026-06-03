export { MATTER_TYPE_OPTIONS } from './matter-field-config'

export const PAYMENT_SCHEDULE_OPTIONS = [
  '50% on engagement, balance prior to lodgement',
  '100% upfront on engagement',
  'Staged: 33% on engagement, 33% on lodgement, 34% on decision',
  'Hourly rate — invoiced per block of work, due within 7 days',
  'Fixed fee — as specified in this agreement',
] as const

export const WIZARD_STEPS = [
  'CLIENT',
  'MATTER',
  'FEES',
  'TERMS',
  'PREVIEW',
  'SEND',
] as const

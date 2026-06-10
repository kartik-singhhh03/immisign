import type { AgreementFeeItemDraft, AgreementWizardFormData } from '../types/wizard'

export type FeeTotals = {
  professionalFees: number
  governmentFees: number
  disbursements: number
  grandTotal: number
}

function parseAmount(value: string | number | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function classifyCategory(category: string): 'professional' | 'government' | 'disbursement' {
  const c = category.trim().toLowerCase()
  if (c.includes('professional')) return 'professional'
  if (c.includes('government')) return 'government'
  return 'disbursement'
}

export function calculateFeeTotals(items: AgreementFeeItemDraft[]): FeeTotals {
  let professionalFees = 0
  let governmentFees = 0
  let disbursements = 0

  for (const item of items) {
    const amount = parseAmount(item.amount)
    const bucket = classifyCategory(item.category)
    if (bucket === 'professional') professionalFees += amount
    else if (bucket === 'government') governmentFees += amount
    else disbursements += amount
  }

  return {
    professionalFees,
    governmentFees,
    disbursements,
    grandTotal: professionalFees + governmentFees + disbursements,
  }
}

export function createEmptyFeeItem(sortOrder = 0): AgreementFeeItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    amount: '',
    category: '',
    dueTrigger: '',
    notes: '',
    sortOrder,
  }
}

export function normalizeFeeItemsFromForm(form: Partial<AgreementWizardFormData>): AgreementFeeItemDraft[] {
  if (Array.isArray(form.feeItems) && form.feeItems.length > 0) {
    return form.feeItems.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      description: item.description || '',
      amount: item.amount || '',
      category: item.category || '',
      dueTrigger: item.dueTrigger || '',
      notes: item.notes || '',
      sortOrder: item.sortOrder ?? index,
    }))
  }

  const legacy: AgreementFeeItemDraft[] = []
  if (form.professionalFee && parseAmount(form.professionalFee) > 0) {
    legacy.push({
      id: crypto.randomUUID(),
      description: 'Professional Fee',
      amount: form.professionalFee,
      category: 'Professional Fee',
      dueTrigger: '',
      notes: '',
      sortOrder: 0,
    })
  }
  if (form.estimatedDisbursements && parseAmount(form.estimatedDisbursements) > 0) {
    legacy.push({
      id: crypto.randomUUID(),
      description: 'Estimated Disbursements',
      amount: form.estimatedDisbursements,
      category: 'Disbursement',
      dueTrigger: '',
      notes: '',
      sortOrder: legacy.length,
    })
  }
  return legacy
}

export function formatCurrencyAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

export function feesStepIsValid(items: AgreementFeeItemDraft[]): boolean {
  return items.some((item) => item.description.trim() && parseAmount(item.amount) > 0)
}

import type {
  AgreementFeeItemDraft,
  AgreementWizardFormData,
  GovernmentFeeDraft,
  ProfessionalFeeBlockDraft,
} from '../types/wizard'

export type FeeTotals = {
  professionalFees: number
  governmentFees: number
  grandTotal: number
}

function parseAmount(value: string | number | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function createProfessionalFeeBlock(blockNumber: number): ProfessionalFeeBlockDraft {
  return {
    id: crypto.randomUUID(),
    blockNumber,
    description: '',
    amount: '',
  }
}

export function createEmptyGovernmentFee(key: GovernmentFeeDraft['key'], label: string): GovernmentFeeDraft {
  return { id: crypto.randomUUID(), key, label, amount: '' }
}

export function defaultGovernmentFees(): GovernmentFeeDraft[] {
  return [
    createEmptyGovernmentFee('first_vac', 'First VAC'),
    createEmptyGovernmentFee('second_vac', 'Second VAC'),
    createEmptyGovernmentFee('additional_vac', 'Additional VAC'),
  ]
}

/** Migrate legacy flat feeItems into block structure. */
export function normalizeProfessionalBlocksFromForm(
  form: Partial<AgreementWizardFormData>,
): ProfessionalFeeBlockDraft[] {
  if (Array.isArray(form.professionalFeeBlocks) && form.professionalFeeBlocks.length > 0) {
    return form.professionalFeeBlocks.map((b, i) => ({
      id: b.id || crypto.randomUUID(),
      blockNumber: b.blockNumber ?? i + 1,
      description: b.description || '',
      amount: b.amount || '',
    }))
  }

  const legacy = normalizeLegacyFeeItems(form)
  const professional = legacy.filter(
    (item) =>
      item.category.toLowerCase().includes('professional') ||
      (!item.category && !item.dueTrigger),
  )
  if (professional.length) {
    return professional.map((item, i) => ({
      id: item.id,
      blockNumber: i + 1,
      description: item.description,
      amount: item.amount,
    }))
  }

  if (form.professionalFee && parseAmount(form.professionalFee) > 0) {
    return [
      {
        id: crypto.randomUUID(),
        blockNumber: 1,
        description: 'Professional Fees',
        amount: form.professionalFee,
      },
    ]
  }

  return []
}

export function normalizeGovernmentFeesFromForm(
  form: Partial<AgreementWizardFormData>,
): GovernmentFeeDraft[] {
  if (Array.isArray(form.governmentFees) && form.governmentFees.length > 0) {
    return form.governmentFees.map((g) => ({
      id: g.id || crypto.randomUUID(),
      key: g.key,
      label: g.label,
      amount: g.amount || '',
    }))
  }

  const legacy = normalizeLegacyFeeItems(form)
  const defaults = defaultGovernmentFees()
  const govLegacy = legacy.filter((item) => item.category.toLowerCase().includes('government'))
  govLegacy.forEach((item, i) => {
    if (defaults[i]) {
      defaults[i] = { ...defaults[i], amount: item.amount }
    }
  })
  return defaults
}

function normalizeLegacyFeeItems(form: Partial<AgreementWizardFormData>): AgreementFeeItemDraft[] {
  if (!Array.isArray(form.feeItems) || form.feeItems.length === 0) return []
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

export function calculateFeeTotals(form: Partial<AgreementWizardFormData>): FeeTotals {
  const blocks = normalizeProfessionalBlocksFromForm(form)
  const gov = normalizeGovernmentFeesFromForm(form)

  const professionalFees = blocks.reduce((sum, b) => sum + parseAmount(b.amount), 0)
  const governmentFees = gov.reduce((sum, g) => sum + parseAmount(g.amount), 0)

  return {
    professionalFees,
    governmentFees,
    grandTotal: professionalFees + governmentFees,
  }
}

/** @deprecated Legacy — use calculateFeeTotals(form) */
export function calculateFeeTotalsFromItems(items: AgreementFeeItemDraft[]): FeeTotals {
  return calculateFeeTotals({ feeItems: items })
}

export function feesStepIsValid(form: Partial<AgreementWizardFormData>): boolean {
  const blocks = normalizeProfessionalBlocksFromForm(form)
  return blocks.some((b) => b.description.trim() && parseAmount(b.amount) > 0)
}

export function flattenFeesForPersistence(form: AgreementWizardFormData): AgreementFeeItemDraft[] {
  const rows: AgreementFeeItemDraft[] = []
  normalizeProfessionalBlocksFromForm(form).forEach((block) => {
    rows.push({
      id: block.id,
      description: `Block ${block.blockNumber}: ${block.description}`,
      amount: block.amount,
      category: 'professional',
      dueTrigger: '',
      notes: 'GST included',
      sortOrder: block.blockNumber,
    })
  })
  normalizeGovernmentFeesFromForm(form).forEach((g, i) => {
    if (!parseAmount(g.amount)) return
    rows.push({
      id: g.id,
      description: g.label,
      amount: g.amount,
      category: 'government',
      dueTrigger: '',
      notes: '',
      sortOrder: 100 + i,
    })
  })
  return rows
}

/** @deprecated */
export function normalizeFeeItemsFromForm(form: Partial<AgreementWizardFormData>): AgreementFeeItemDraft[] {
  if (form.professionalFeeBlocks?.length || form.governmentFees?.length) {
    return flattenFeesForPersistence(form as AgreementWizardFormData)
  }
  return normalizeLegacyFeeItems(form)
}

export function createEmptyFeeItem(sortOrder = 0): AgreementFeeItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    amount: '',
    category: 'professional',
    dueTrigger: '',
    notes: '',
    sortOrder,
  }
}

export function formatCurrencyAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

export function formatMatterDisplayLine(form: Pick<
  AgreementWizardFormData,
  'matterType' | 'visaSubclass' | 'visaStreamLabel'
>): string {
  const type = form.matterType?.trim()
  if (!type) return '—'
  const subclass = form.visaSubclass?.trim()
  const stream = form.visaStreamLabel?.trim()
  if (subclass && stream) return `${type} - ${subclass} ${stream}`
  if (subclass) return `${type} - ${subclass}`
  return type
}

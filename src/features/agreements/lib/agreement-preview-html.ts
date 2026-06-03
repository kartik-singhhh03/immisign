import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from '../types/wizard'
import { generateProvisionalAgreementRef } from '../types/wizard'
import type { MatterTypeConfig } from '@/lib/settings/types'

export type AgreementPreviewContext = {
  form: AgreementWizardFormData
  agency: AgencyWizardContext
  rma: RmaOption | null
  agreementRef?: string
  statusLabel?: string
  matterTypeConfig?: MatterTypeConfig | null
  selectedClauses?: Array<{ title: string; content: string; orderIndex?: number }>
}

function formatCurrencyAud(val: string): string {
  const num = parseFloat(val || '')
  if (!Number.isFinite(num) || num <= 0) return '—'
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>')
}

function formatDisplayDate(raw: string): string {
  if (!raw) return '—'
  const auMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (auMatch) {
    const [, d, m, y] = auMatch
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
    }
  }
  const iso = new Date(raw)
  if (!Number.isNaN(iso.getTime())) {
    return iso.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  return raw
}

function scopeToHtml(scope: string): string {
  const lines = scope.split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return '<p class="muted">—</p>'
  if (lines.every((l) => /^\d+\./.test(l))) {
    return `<ol class="scope-list">${lines
      .map((l) => `<li>${escapeHtml(l.replace(/^\d+\.\s*/, ''))}</li>`)
      .join('')}</ol>`
  }
  return `<div class="scope-block">${nl2br(scope)}</div>`
}

function fieldRow(label: string, value: string | undefined | null): string {
  if (!value?.trim()) return ''
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value.trim())}</td></tr>`
}

function clauseSection(num: number, title: string, content: string): string {
  return `
    <section class="clause">
      <h2 class="clause-title"><span class="clause-num">Section ${num}</span> ${escapeHtml(title)}</h2>
      <div class="scope-block">${nl2br(content)}</div>
    </section>`
}

function buildDocumentStyles(agency: AgencyWizardContext): string {
  const primary = agency.branding?.primaryColor || '#0D9F8C'
  const secondary = agency.branding?.secondaryColor || '#081B2E'
  const font = agency.branding?.fontFamily || "'Segoe UI', Calibri, Arial, sans-serif"

  return `
  @page { size: A4; margin: 14mm 16mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${font};
    color: #0f172a;
    font-size: 10.5pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .document { max-width: 100%; }
  .doc-banner {
    border-bottom: 4px solid ${primary};
    padding-bottom: 14px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .doc-banner h1 {
    margin: 0;
    font-size: 17pt;
    letter-spacing: 0.06em;
    font-weight: 800;
    color: ${secondary};
    text-transform: uppercase;
    flex: 1;
  }
  .agency-logo {
    max-height: 52px;
    max-width: 160px;
    object-fit: contain;
  }
  .header-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 20px;
    margin-bottom: 16px;
  }
  .agency-block .label, .meta-block .label {
    font-size: 7.5pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
  }
  .agency-block p, .meta-block p { margin: 2px 0; font-size: 10pt; }
  .agency-name { font-size: 13pt; font-weight: 800; color: ${secondary}; margin-bottom: 4px !important; }
  .meta-block { text-align: right; }
  .meta-line { margin-bottom: 10px !important; }
  .meta-line strong { display: block; font-size: 11pt; color: ${secondary}; }
  .status-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    color: #92400e;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.06em;
  }
  .compliance {
    background: #ecfdf5;
    border: 1px solid #99f6e4;
    border-left: 4px solid ${primary};
    padding: 12px 14px;
    margin-bottom: 18px;
    border-radius: 6px;
    font-size: 10pt;
  }
  .compliance strong { color: #065f46; }
  .compliance a { color: ${primary}; font-weight: 700; text-decoration: none; }
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }
  .party-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .party-head {
    background: ${secondary};
    color: #fff;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    padding: 8px 12px;
    text-transform: uppercase;
  }
  .party-body { padding: 12px 14px; background: #f8fafc; }
  .party-body p { margin: 3px 0; font-size: 10pt; }
  .party-body .name { font-size: 11pt; font-weight: 800; color: ${secondary}; margin-bottom: 6px !important; }
  .clause-title {
    font-size: 10.5pt;
    font-weight: 800;
    color: ${secondary};
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #e2e8f0;
  }
  .clause-num { color: ${primary}; margin-right: 6px; }
  .clause { margin-bottom: 16px; page-break-inside: avoid; }
  .clause p { margin: 0 0 8px; color: #334155; font-size: 10pt; }
  .matter-table, .fees-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10pt;
  }
  .matter-table th, .matter-table td, .fees-table th, .fees-table td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  .matter-table th, .fees-table th {
    width: 34%;
    background: #f1f5f9;
    font-weight: 700;
    color: #475569;
    font-size: 9pt;
  }
  .fees-table td.value { font-weight: 700; color: ${secondary}; }
  .scope-list { margin: 0; padding-left: 20px; }
  .scope-list li { margin-bottom: 6px; color: #334155; }
  .scope-block { color: #334155; }
  .special-terms {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-left: 5px solid #f59e0b;
    padding: 14px 16px;
    margin: 18px 0;
    border-radius: 6px;
    page-break-inside: avoid;
  }
  .special-terms h2 {
    margin: 0 0 10px;
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #92400e;
  }
  .special-terms .body { white-space: pre-wrap; font-size: 10pt; color: #78350f; }
  .consumer-guide {
    border: 1px dashed #94a3b8;
    padding: 12px 14px;
    margin: 18px 0;
    border-radius: 6px;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  .consumer-guide a { color: ${primary}; font-weight: 700; }
  .signature-page { page-break-before: always; margin-top: 8px; }
  .signature-title {
    text-align: center;
    font-size: 12pt;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${secondary};
    margin: 0 0 6px;
  }
  .signature-sub {
    text-align: center;
    font-size: 9pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.04em;
    margin-bottom: 20px;
  }
  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .sig-card {
    border: 2px solid #64748b;
    border-radius: 8px;
    min-height: 180px;
    padding: 14px;
    page-break-inside: avoid;
  }
  .sig-card h3 {
    margin: 0 0 10px;
    font-size: 8.5pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0D9F8C;
  }
  .sig-name { font-weight: 800; font-size: 10.5pt; color: #081B2E; margin: 0 0 2px; }
  .sig-meta { font-size: 9pt; color: #64748b; margin: 0 0 16px; }
  .sig-box {
    height: 56px;
    border: 1px dashed #94a3b8;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 9pt;
    font-style: italic;
    margin-bottom: 12px;
    background: #fff;
  }
  .sig-date {
    border-top: 1px solid #cbd5e1;
    padding-top: 8px;
    font-size: 9pt;
    color: #475569;
  }
  .doc-footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 2px solid #e2e8f0;
    text-align: center;
    font-size: 8.5pt;
    color: #64748b;
    line-height: 1.6;
    page-break-inside: avoid;
  }
  .doc-footer strong { color: ${primary}; font-weight: 800; }
  .muted { color: #94a3b8; }
  .sig-card h3 { color: ${primary}; }
`
}

export function buildAgreementPreviewHtml(ctx: AgreementPreviewContext): string {
  const { form, agency, rma } = ctx
  const prefix = agency.branding?.agreementRefPrefix || 'AGR'
  const agreementRef = ctx.agreementRef || generateProvisionalAgreementRef(prefix)
  const statusLabel = ctx.statusLabel || 'AWAITING SIGNATURE'
  const agreementDate = formatDisplayDate(form.agreementDate)
  const documentStyles = buildDocumentStyles(agency)
  const primaryColor = agency.branding?.primaryColor || '#0D9F8C'
  const logoUrl = agency.branding?.logoUrl
  const headerTitle = agency.branding?.agreementHeaderTitle || 'Migration Agent Service Agreement'
  const footerText = agency.branding?.agreementFooterText ||
    'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.'

  const agentName = (rma?.name || agency.principalName || '').replace(/\s*\([^)]*\)\s*$/, '')
  const agentMarn = rma?.marn || agency.marn || ''
  const principalName = agency.principalName || agentName
  const agencyDisplayName = agency.legalName || agency.name

  const clientName = form.clientName || form.primaryApplicantName || ''
  const primaryApplicant = form.primaryApplicantName || form.clientName || ''
  const matterConfig = ctx.matterTypeConfig

  const matterRows = [
    fieldRow('Matter Type', form.matterType),
    fieldRow('Visa Subclass', form.visaSubclass),
    fieldRow('Primary Applicant', primaryApplicant),
    form.primaryApplicantDob ? fieldRow('Primary Applicant Date of Birth', form.primaryApplicantDob) : '',
    matterConfig?.showSecondaryApplicant && form.secondaryApplicantName
      ? fieldRow('Secondary Applicant', form.secondaryApplicantName)
      : '',
    matterConfig?.showSecondaryApplicant && form.secondaryApplicantDob && form.secondaryApplicantName
      ? fieldRow('Secondary Applicant Date of Birth', form.secondaryApplicantDob)
      : '',
    matterConfig?.showDependants && form.dependant1Name ? fieldRow('Dependant 1', form.dependant1Name) : '',
    matterConfig?.showDependants && form.dependant1Dob && form.dependant1Name
      ? fieldRow('Dependant 1 Date of Birth', form.dependant1Dob)
      : '',
    matterConfig?.showDependants && form.dependant2Name ? fieldRow('Dependant 2', form.dependant2Name) : '',
    matterConfig?.showDependants && form.dependant2Dob && form.dependant2Name
      ? fieldRow('Dependant 2 Date of Birth', form.dependant2Dob)
      : '',
    matterConfig?.showDependants && form.dependant3Name ? fieldRow('Dependant 3', form.dependant3Name) : '',
    matterConfig?.showDependants && form.dependant3Dob && form.dependant3Name
      ? fieldRow('Dependant 3 Date of Birth', form.dependant3Dob)
      : '',
    matterConfig?.showSponsor && form.sponsorName ? fieldRow('Sponsor Name', form.sponsorName) : '',
    ...(matterConfig?.fields || []).map((def) =>
      fieldRow(def.label, form.matterFieldValues?.[def.key] || '')
    ),
    fieldRow('File / Lodgement Reference', form.fileLodgementRef),
  ].filter(Boolean).join('')

  const specialTermsBlock = form.specialTerms?.trim()
    ? `
    <div class="special-terms">
      <h2>Special Terms</h2>
      <div class="body">${escapeHtml(form.specialTerms.trim())}</div>
    </div>`
    : ''

  const selectedClauses = ctx.selectedClauses || []
  const clauseSectionsBlock = selectedClauses
    .filter((c) => c.title?.trim() && c.content?.trim())
    .map((c, idx) => clauseSection(4 + idx, c.title, c.content))
    .join('')

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(headerTitle)} — ${escapeHtml(agreementRef)}</title>
  <style>${documentStyles}</style>
</head>
<body>
  <div class="document">

    <header class="doc-banner">
      <h1>${escapeHtml(headerTitle)}</h1>
      ${logoUrl ? `<img class="agency-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(agency.name)} logo"/>` : ''}
    </header>

    <div class="header-grid">
      <div class="agency-block">
        <div class="label">Agency Information</div>
        <p class="agency-name">${escapeHtml(agency.name)}</p>
        ${principalName ? `<p><strong>Principal:</strong> ${escapeHtml(principalName)}</p>` : ''}
        ${agentMarn ? `<p><strong>MARN:</strong> ${escapeHtml(agentMarn)}</p>` : ''}
        ${agency.email ? `<p><strong>Email:</strong> ${escapeHtml(agency.email)}</p>` : ''}
        ${agency.phone ? `<p><strong>Phone:</strong> ${escapeHtml(agency.phone)}</p>` : ''}
        ${agency.address ? `<p><strong>Address:</strong> ${escapeHtml(agency.address)}</p>` : ''}
      </div>
      <div class="meta-block">
        <div class="label">Agreement Details</div>
        <p class="meta-line"><span class="label">Agreement Reference</span><strong>${escapeHtml(agreementRef)}</strong></p>
        <p class="meta-line"><span class="label">Agreement Date</span><strong>${escapeHtml(agreementDate)}</strong></p>
        <p class="meta-line"><span class="label">Agreement Status</span><span class="status-badge">${escapeHtml(statusLabel)}</span></p>
      </div>
    </div>

    <div class="compliance">
      <strong>Code of Conduct:</strong> This Agreement complies with the Registered Migration Agent Code of Conduct (March 2022).
      For further information visit the Office of the Migration Agents Registration Authority (MARA) at
      <a href="https://www.mara.gov.au/">https://www.mara.gov.au/</a>.
    </div>

    <div class="parties">
      <div class="party-card">
        <div class="party-head">The Agent</div>
        <div class="party-body">
          <p class="name">${escapeHtml(agentName || '—')}</p>
          <p>Registered Migration Agent</p>
          ${agentMarn ? `<p>MARN: ${escapeHtml(agentMarn)}</p>` : ''}
          <p>${escapeHtml(agencyDisplayName)}</p>
        </div>
      </div>
      <div class="party-card">
        <div class="party-head">The Client</div>
        <div class="party-body">
          <p class="name">${escapeHtml(clientName || '—')}</p>
          ${form.clientEmail ? `<p>${escapeHtml(form.clientEmail)}</p>` : ''}
          ${form.clientAddress ? `<p>${escapeHtml(form.clientAddress)}</p>` : ''}
          ${form.clientPhone ? `<p>${escapeHtml(form.clientPhone)}</p>` : ''}
        </div>
      </div>
    </div>

    <section class="clause">
      <h2 class="clause-title"><span class="clause-num">Section 1</span> Matter &amp; Parties</h2>
      <table class="matter-table">
        <tbody>
          ${matterRows || '<tr><td class="muted">No matter details provided.</td></tr>'}
        </tbody>
      </table>
    </section>

    <section class="clause">
      <h2 class="clause-title"><span class="clause-num">Section 2</span> Scope of Work</h2>
      ${scopeToHtml(form.scopeOfServices)}
    </section>

    <section class="clause">
      <h2 class="clause-title"><span class="clause-num">Section 3</span> Professional Fees &amp; Disbursements</h2>
      <table class="fees-table">
        <tbody>
          <tr><th>Professional fee</th><td class="value">${formatCurrencyAud(form.professionalFee)}</td></tr>
          <tr><th>Estimated disbursements</th><td class="value">${formatCurrencyAud(form.estimatedDisbursements)}</td></tr>
          <tr><th>Payment schedule</th><td class="value">${escapeHtml(form.paymentSchedule || '—')}</td></tr>
        </tbody>
      </table>
    </section>

    ${clauseSectionsBlock}

    ${specialTermsBlock}

    <section class="signature-page">
      <h2 class="signature-title">Signatures</h2>
      <p class="signature-sub">I HAVE READ AND UNDERSTOOD THE TERMS OF THIS AGREEMENT</p>
      <div class="sig-grid">
        <div class="sig-card">
          <h3>Agent Signature</h3>
          <p class="sig-name">${escapeHtml(agentName || '—')}</p>
          ${agentMarn ? `<p class="sig-meta">MARN: ${escapeHtml(agentMarn)}</p>` : '<p class="sig-meta">&nbsp;</p>'}
          <div class="sig-box">Sign here</div>
          <div class="sig-date">Date: _______________________________</div>
        </div>
        <div class="sig-card">
          <h3>Client Signature</h3>
          <p class="sig-name">${escapeHtml(clientName || '—')}</p>
          <p class="sig-meta">&nbsp;</p>
          <div class="sig-box">Sign here</div>
          <div class="sig-date">Date: _______________________________</div>
        </div>
      </div>
    </section>

    <footer class="doc-footer">
      <p><strong>${escapeHtml(agencyDisplayName)}</strong>${agency.abn ? ` · ABN ${escapeHtml(agency.abn)}` : ''}</p>
      ${agency.address ? `<p>${escapeHtml(agency.address)}</p>` : ''}
      <p>${[agency.phone, agency.email].filter(Boolean).map((v) => escapeHtml(v!)).join(' · ')}</p>
      <p>${escapeHtml(footerText)}</p>
      <p><strong style="color:${primaryColor}">Powered by ImmiSign</strong> · MARA-compliant e-signature platform</p>
    </footer>

  </div>
</body>
</html>`
}

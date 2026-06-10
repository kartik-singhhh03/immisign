import type { ServiceStatement, ServiceStatementItem } from '../types';
import { buildFeeComparison, formatAud } from './fee-comparison';
import {
  buildPdfRunningHeaderCss,
  buildPdfRunningHeaderHtml,
  type PdfRunningHeaderContext,
} from '@/lib/documents/pdf-running-header';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export type SosPreviewOptions = {
  agency: { name: string; marn?: string | null; address?: string | null };
  complianceDisclosure?: string | null;
  headerContext?: PdfRunningHeaderContext;
};

export function buildSosPreviewHtml(
  statement: ServiceStatement,
  items: ServiceStatementItem[],
  options: SosPreviewOptions,
): string {
  const agency = options.agency;
  const services = items
    .filter((i) => i.line_type === 'service')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => `<li>${escapeHtml(i.description)}</li>`)
    .join('');

  const payMethods = (statement.payment_methods || []).join(', ') || '—';
  const marn = agency.marn || '';
  const address = agency.address || '';
  const feeComparison = buildFeeComparison(
    statement.quoted_professional_fee,
    statement.professional_fee,
  );

  const comparisonBlock = feeComparison
    ? `<div class="fee-comparison">
        <div class="fee-comp-row"><span>Quoted Fee:</span><span>${formatAud(feeComparison.quoted)}</span></div>
        <div class="fee-comp-row"><span>Actual Fee:</span><span>${formatAud(feeComparison.actual)}</span></div>
        <div class="fee-comp-row fee-comp-diff"><span>Difference:</span><span>${formatAud(feeComparison.difference)}</span></div>
      </div>`
    : '';

  const disclosure =
    options.complianceDisclosure?.trim() ||
    'Compliance disclosure not configured. Contact your agency administrator.';

  const runningHeader = buildPdfRunningHeaderHtml(
    options.headerContext || {
      agencyName: agency.name,
      marn: marn || null,
      matterRef: statement.statement_number,
      clientName: statement.client_name,
    },
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${buildPdfRunningHeaderCss()}
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 13.5px; line-height: 1.5; margin: 0; padding: 48px 52px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a3a5c; padding-bottom: 20px; margin-bottom: 24px; }
    .doc-logo { font-size: 18px; font-weight: 700; color: #1a3a5c; }
    .doc-logo span { display: block; font-size: 10px; font-weight: 400; color: #6b7280; margin-top: 4px; }
    .doc-title-block h2 { margin: 0; font-size: 22px; color: #1a3a5c; }
    .doc-title-block p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    h3 { font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; color: #2a7a6a; margin: 0 0 12px; border-bottom: 1px solid #e2e0d8; padding-bottom: 6px; }
    .doc-section { margin-bottom: 22px; }
    .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .doc-kv .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px; }
    .doc-kv div:last-child { font-weight: 500; color: #1a3a5c; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
    .doc-fee-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e0d8; font-size: 13px; }
    .doc-fee-total { display: flex; justify-content: space-between; padding: 12px 0 0; font-weight: 700; font-size: 16px; color: #1a3a5c; border-top: 2px solid #1a3a5c; margin-top: 8px; }
    .fee-comparison { margin-top: 14px; padding: 12px 14px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; }
    .fee-comp-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .fee-comp-diff { font-weight: 700; color: #92400e; border-top: 1px solid #fde68a; margin-top: 6px; padding-top: 8px; }
    .compliance-text { background: #f5f4f0; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #6b7280; line-height: 1.5; border: 1px solid #e2e0d8; }
    .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }
    .sig-block { font-size: 12px; line-height: 1.5; }
    .sig-line { border-bottom: 1px solid #1a1a1a; height: 48px; margin-bottom: 8px; }
    .pay-meta { margin-top: 10px; font-size: 12px; color: #6b7280; }
    .notes { margin-top: 8px; font-size: 13px; color: #555; }
  </style>
</head>
<body>
  ${runningHeader}
  <div class="doc-header">
    <div class="doc-logo">
      ImmiMate
      <span>${escapeHtml(agency.name)}${marn ? ` · MARN ${escapeHtml(marn)}` : ''}</span>
    </div>
    <div class="doc-title-block">
      <h2>Statement of Service</h2>
      <p>${escapeHtml(statement.statement_number || '')} · ${formatDate(statement.issued_at || statement.generated_at || new Date().toISOString())}</p>
    </div>
  </div>

  <div class="doc-section">
    <h3>Client Details</h3>
    <div class="doc-grid">
      <div class="doc-kv"><div class="k">Client Name</div><div>${escapeHtml(statement.client_name || '—')}</div></div>
      <div class="doc-kv"><div class="k">Client Number</div><div>${escapeHtml(statement.client_number || '—')}</div></div>
      <div class="doc-kv"><div class="k">Visa Subclass</div><div>${escapeHtml(statement.visa_subclass || '—')}</div></div>
      <div class="doc-kv"><div class="k">Services Completed</div><div>${formatDate(statement.services_completed_at)}</div></div>
      <div class="doc-kv"><div class="k">Email</div><div>${escapeHtml(statement.client_email || '—')}</div></div>
      <div class="doc-kv"><div class="k">Phone</div><div>${escapeHtml(statement.client_phone || '—')}</div></div>
    </div>
  </div>

  <div class="doc-section">
    <h3>Services Rendered</h3>
    <ul>${services || '<li>—</li>'}</ul>
    ${statement.services_notes ? `<div class="notes">${escapeHtml(statement.services_notes)}</div>` : ''}
  </div>

  <div class="doc-section">
    <h3>Fee Summary</h3>
    <div class="doc-fee-row"><span>Professional Fee</span><span>${formatAud(Number(statement.professional_fee || 0))}</span></div>
    ${comparisonBlock}
    <div class="doc-fee-row"><span>Government / DIBP Fees</span><span>${formatAud(Number(statement.government_fee || 0))}</span></div>
    <div class="doc-fee-row"><span>Disbursements</span><span>${formatAud(Number(statement.disbursements || 0))}</span></div>
    <div class="doc-fee-total"><span>Total Received</span><span>${formatAud(Number(statement.total_received || 0))}</span></div>
    <div class="pay-meta">
      Payment: ${escapeHtml(payMethods)} · ${escapeHtml(statement.payment_dates || '—')} · ${escapeHtml(statement.payment_terms || '—')}
    </div>
  </div>

  <div class="doc-section">
    <h3>Standard Compliance Disclosure</h3>
    <div class="compliance-text">${nl2br(disclosure)}</div>
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-line"></div>
      <strong>Registered Migration Agent</strong><br>
      ${marn ? `MARN ${escapeHtml(marn)}<br>` : ''}
      ${escapeHtml(agency.name)}${address ? `<br>${escapeHtml(address)}` : ''}<br>
      Date: _______________
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <strong>Client Acknowledgement</strong><br>
      ${escapeHtml(statement.client_name || 'Client Name')}<br>
      I acknowledge receipt of this Statement of Service<br>
      Date: _______________
    </div>
  </div>
</body>
</html>`;
}

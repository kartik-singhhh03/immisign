export type PdfRunningHeaderContext = {
  marn?: string | null;
  matterRef?: string | null;
  clientName?: string | null;
  agencyName?: string | null;
};

export function buildPdfRunningHeaderHtml(ctx: PdfRunningHeaderContext): string {
  const parts: string[] = [];
  if (ctx.agencyName) parts.push(ctx.agencyName);
  if (ctx.marn) parts.push(`MARN ${ctx.marn}`);
  if (ctx.matterRef) parts.push(`Matter Ref: ${ctx.matterRef}`);
  if (ctx.clientName) parts.push(ctx.clientName);
  if (!parts.length) return '';
  return `<div class="pdf-running-header">${parts.map((p) => escapeHtml(p)).join(' · ')}</div>`;
}

export function buildPdfRunningHeaderCss(): string {
  return `
  .pdf-running-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    font-size: 8pt;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 0 8px;
    background: #fff;
    z-index: 1000;
  }
  body { padding-top: 40px; }
  @page { size: A4 portrait; margin: 14mm 16mm 18mm; }
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

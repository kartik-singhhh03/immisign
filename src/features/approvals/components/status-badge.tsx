const STYLES: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  sent: 'bg-amber-50 text-amber-800 border-amber-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  changes_requested: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-300',
};

const LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Pending Review',
  viewed: 'Viewed',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  expired: 'Expired',
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold leading-5 ${STYLES[status] || STYLES.draft}`}
    >
      {LABELS[status] || status.replace(/_/g, ' ')}
    </span>
  );
}

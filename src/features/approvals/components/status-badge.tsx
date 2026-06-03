import { ApprovalStatus } from '../../types';

const STYLES: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  changes_requested: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ready_to_lodge: 'bg-teal-50 text-teal-700 border-teal-200',
  lodged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-300',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  ready_to_lodge: 'Ready to Lodge',
  lodged: 'Lodged',
  closed: 'Closed',
  rejected: 'Rejected',
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  const key = status as ApprovalStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold leading-5 ${STYLES[key] || STYLES.draft}`}
    >
      {LABELS[key] || status}
    </span>
  );
}

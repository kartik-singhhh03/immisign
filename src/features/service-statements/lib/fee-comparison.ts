export type FeeComparison = {
  quoted: number;
  actual: number;
  difference: number;
};

export function buildFeeComparison(
  quoted: number | null | undefined,
  actual: number | null | undefined,
): FeeComparison | null {
  const q = Number(quoted ?? 0);
  const a = Number(actual ?? 0);
  if (!Number.isFinite(q) || !Number.isFinite(a)) return null;
  if (Math.abs(q - a) < 0.005) return null;
  return {
    quoted: q,
    actual: a,
    difference: Math.round((a - q) * 100) / 100,
  };
}

export function formatAud(amount: number): string {
  const prefix = amount < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Normalize a person name for comparison (case/space/punctuation insensitive). */
export function normalizePersonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/** Verify typed name matches expected first + middle + last parts. */
export function verifyClientLegalName(
  typed: string,
  expected: { first?: string; middle?: string; last?: string; fallback?: string },
): boolean {
  const normalizedTyped = normalizePersonName(typed);
  if (!normalizedTyped) return false;

  const parts = [expected.first, expected.middle, expected.last]
    .filter(Boolean)
    .map((p) => normalizePersonName(p!))
    .join(' ')
    .trim();

  if (parts && normalizedTyped === parts) return true;

  if (expected.fallback && normalizePersonName(expected.fallback) === normalizedTyped) {
    return true;
  }

  // Allow match without middle name
  const withoutMiddle = [expected.first, expected.last]
    .filter(Boolean)
    .map((p) => normalizePersonName(p!))
    .join(' ')
    .trim();
  if (withoutMiddle && normalizedTyped === withoutMiddle) return true;

  return false;
}

/** Approximate page count from a PDF buffer (no extra dependencies). */
export function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString('latin1');
  const pageMatches = text.match(/\/Type\s*\/Page\b/g);
  if (pageMatches && pageMatches.length > 0) {
    return pageMatches.length;
  }
  const countMatch = text.match(/\/Count\s+(\d+)/);
  if (countMatch) {
    const n = parseInt(countMatch[1], 10);
    if (n > 0 && n < 500) return n;
  }
  return 1;
}

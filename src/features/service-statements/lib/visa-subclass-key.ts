/** Map free-text visa subclass labels to template keys (client-centric, no matter entity). */
export function resolveVisaSubclassKey(visaSubclass: string | null | undefined): string {
  if (!visaSubclass) return 'default';
  const v = visaSubclass.toLowerCase();
  if (v.includes('190')) return '190';
  if (v.includes('820') || v.includes('801') || v.includes('partner')) return '820';
  if (v.includes('482') || v.includes('skill shortage')) return '482';
  if (v.includes('143') || v.includes('parent')) return '143';
  if (v.includes('600') || v.includes('visitor')) return 'default';
  if (v.includes('aat') || v.includes('art') || v.includes('appeal')) return 'aat';
  const match = v.match(/subclass\s*(\d{3})/i) || v.match(/\b(\d{3})\b/);
  if (match?.[1]) return match[1];
  return 'default';
}

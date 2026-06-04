/** Hide seed / QA rows from production UI lists. */

const DEMO_EMAIL_DOMAINS = ['@example.com', '@test.com', '@mailinator.com', '@immisign.test'];
const DEMO_PHONE_RE = /^0?4000000000$/;
const DEMO_NAME_RE = /^(phase\s*\d|phase\d|demo\s|test\s|qa\s|e2e\s)/i;

export function isDemoClientRecord(client: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): boolean {
  const name = (client.name || '').trim();
  const email = (client.email || '').trim().toLowerCase();
  const phone = (client.phone || '').replace(/\s/g, '');

  if (DEMO_NAME_RE.test(name)) return true;
  if (name.toLowerCase().includes('phase11')) return true;
  if (DEMO_EMAIL_DOMAINS.some((d) => email.endsWith(d))) return true;
  if (DEMO_PHONE_RE.test(phone)) return true;
  if (/^client\s*\d{10,}/i.test(name)) return true;
  return false;
}

export function filterProductionClients<T extends { name?: string | null; email?: string | null; phone?: string | null }>(
  rows: T[],
): T[] {
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_DATA === 'true') return rows;
  return rows.filter((r) => !isDemoClientRecord(r));
}

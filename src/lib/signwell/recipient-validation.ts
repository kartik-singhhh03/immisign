export type SignwellRecipient = { email: string; name?: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Remove CC/copied contacts that duplicate a signing recipient (SignWell 422). */
export function filterCopiedContactsNotInRecipients(
  copied: SignwellRecipient[] | undefined,
  recipientEmails: Iterable<string>,
): SignwellRecipient[] | undefined {
  if (!copied?.length) return undefined;
  const seen = new Set<string>();
  for (const e of recipientEmails) seen.add(normalizeEmail(e));
  const filtered = copied.filter((c) => {
    const email = normalizeEmail(c.email || '');
    return email && !seen.has(email);
  });
  return filtered.length ? filtered : undefined;
}

export function findDuplicateRecipientEmails(emails: string[]): string | null {
  const seen = new Set<string>();
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    if (seen.has(email)) return email;
    seen.add(email);
  }
  return null;
}

export function friendlySignwellError(message: string): string {
  if (message.includes('already a recipient') || message.includes('copied_contact')) {
    return 'The CC email cannot be the same as a signer. Use a different email for "CC me" or uncheck CC when testing with your own address as the client.';
  }
  if (message.includes('Trials are limited')) {
    return 'SignWell trial limit reached for today. Try again tomorrow or contact SignWell support.';
  }
  return message;
}

/** Workspace URL slug helpers (signup, onboarding, invites). */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 48;

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'dashboard',
  'help',
  'login',
  'onboarding',
  'settings',
  'signup',
  'support',
  'workspace',
  'www',
]);

export function slugifyAgencyName(agencyName: string): string {
  return agencyName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalize user-edited or generated slug input. */
export function normalizeWorkspaceSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

export type SlugValidationResult =
  | { valid: true; slug: string }
  | { valid: false; error: string };

export function validateWorkspaceSlug(slug: string): SlugValidationResult {
  const normalized = normalizeWorkspaceSlug(slug);

  if (!normalized) {
    return { valid: false, error: 'Workspace URL is required.' };
  }
  if (normalized.length < SLUG_MIN_LENGTH) {
    return {
      valid: false,
      error: `Workspace URL must be at least ${SLUG_MIN_LENGTH} characters.`,
    };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return {
      valid: false,
      error: 'Use lowercase letters, numbers, and hyphens only.',
    };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { valid: false, error: 'This workspace URL is reserved. Choose another.' };
  }
  return { valid: true, slug: normalized };
}

/** Build alternate slugs when the preferred one is taken. */
export function buildSlugSuggestions(baseSlug: string, count = 4): string[] {
  const root = normalizeWorkspaceSlug(baseSlug) || 'workspace';
  const out: string[] = [];
  for (let i = 2; out.length < count && i < 20; i++) {
    const candidate = normalizeWorkspaceSlug(`${root}-${i}`);
    const check = validateWorkspaceSlug(candidate);
    if (check.valid && !out.includes(check.slug)) out.push(check.slug);
  }
  const year = new Date().getFullYear().toString().slice(-2);
  const withYear = normalizeWorkspaceSlug(`${root}-${year}`);
  const yearCheck = validateWorkspaceSlug(withYear);
  if (yearCheck.valid && !out.includes(yearCheck.slug)) out.unshift(yearCheck.slug);
  return out;
}

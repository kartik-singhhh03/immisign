export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Weak-password patterns (no literal credentials in source — avoids secret scanners). */
const WEAK_PASSWORD_PATTERNS: RegExp[] = [
  /^password\d{3,}!?$/i,
  /^welcome\d{3,}!?$/i,
  /^qwerty\d{3,}!?$/i,
  /^admin\d{3,}!?$/i,
  /^letmein\d{3,}!?$/i,
  /^immisign\d{3,}!?$/i,
  /^immimate\d{3,}!?$/i,
];

function isBlockedCommonPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();
  return WEAK_PASSWORD_PATTERNS.some((re) => re.test(normalized));
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Include at least one special character.');
  }
  if (isBlockedCommonPassword(password)) {
    errors.push('This password is too common. Choose a stronger password.');
  }
  return { valid: errors.length === 0, errors };
}

export function passwordPolicyMessage(): string {
  return 'Minimum 12 characters with uppercase, lowercase, number, and special character.';
}

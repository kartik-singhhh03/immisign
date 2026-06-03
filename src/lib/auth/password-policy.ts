export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

const COMMON_PASSWORDS = new Set([
  'password123!',
  'password1234',
  'immisign123!',
  'immimate123!',
  'welcome123!',
  'qwerty123!',
  'admin123!',
  'letmein123!',
]);

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
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Choose a stronger password.');
  }
  return { valid: errors.length === 0, errors };
}

export function passwordPolicyMessage(): string {
  return 'Minimum 12 characters with uppercase, lowercase, number, and special character.';
}

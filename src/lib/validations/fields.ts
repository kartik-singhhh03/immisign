import { z } from 'zod';

/** Characters allowed while typing a phone number */
export const PHONE_INPUT_PATTERN = /^[\d\s+().-]*$/;

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function countPhoneDigits(phone: string): number {
  return phone.replace(/\D/g, '').length;
}

/** Strip letters and other invalid characters during input */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d\s+().-]/g, '');
}

/** Strip to digits only (MARN, ABN) */
export function sanitizeDigitsInput(raw: string, maxLength?: number): string {
  const digits = raw.replace(/\D/g, '');
  return maxLength != null ? digits.slice(0, maxLength) : digits;
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, ' ');
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (phone == null || phone.trim() === '') return true;
  const trimmed = phone.trim();
  if (!PHONE_INPUT_PATTERN.test(trimmed)) return false;
  const digits = countPhoneDigits(trimmed);
  return digits >= 8 && digits <= 15;
}

export function isValidAbn(abn: string | null | undefined): boolean {
  if (abn == null || abn.trim() === '') return true;
  return /^\d{11}$/.test(abn.replace(/\s/g, ''));
}

export function isValidMarn(marn: string | null | undefined): boolean {
  if (marn == null || marn.trim() === '') return true;
  return /^\d{7}$/.test(marn.replace(/\s/g, ''));
}

export function phoneValidationMessage(phone: string): string | null {
  if (!phone.trim()) return null;
  if (!PHONE_INPUT_PATTERN.test(phone.trim())) {
    return 'Phone may only contain numbers, spaces, and + ( ) - .';
  }
  const digits = countPhoneDigits(phone);
  if (digits < 8) return 'Phone number must have at least 8 digits.';
  if (digits > 15) return 'Phone number cannot exceed 15 digits.';
  return null;
}

export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(120, 'Name is too long.')
  .refine((v) => /[a-zA-Z]/.test(v), 'Enter a valid name.');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .refine((v) => EMAIL_RE.test(v.toLowerCase()), 'Enter a valid email address.')
  .transform((v) => v.toLowerCase());

export const optionalEmailSchema = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z
    .string()
    .trim()
    .max(254)
    .email('Enter a valid email address.')
    .transform((s) => s.toLowerCase())
    .nullable()
    .optional(),
);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null || v === '') return null;
    return normalizePhone(v);
  })
  .superRefine((val, ctx) => {
    if (val == null) return;
    const msg = phoneValidationMessage(val);
    if (msg) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    }
  });

export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required.')
  .transform(normalizePhone)
  .superRefine((val, ctx) => {
    const msg = phoneValidationMessage(val);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  });

export const marnSchema = z
  .string()
  .trim()
  .transform((v) => sanitizeDigitsInput(v, 7))
  .refine((v) => v === '' || /^\d{7}$/.test(v), 'MARN must be exactly 7 digits.');

export const requiredMarnSchema = z
  .string()
  .trim()
  .transform((v) => sanitizeDigitsInput(v, 7))
  .refine((v) => /^\d{7}$/.test(v), 'MARN must be exactly 7 digits.');

export const abnSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null || v === '') return null;
    return sanitizeDigitsInput(v, 11);
  })
  .pipe(
    z.union([
      z.null(),
      z.string().length(11, 'ABN must be exactly 11 digits.'),
    ]),
  );

export const websiteSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .pipe(
    z.union([
      z.null(),
      z
        .string()
        .refine(
          (v) => /^https?:\/\/.+/i.test(v) || /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}/i.test(v),
          'Enter a valid website URL (e.g. https://example.com.au).',
        ),
    ]),
  );

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(' ');
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data;
}

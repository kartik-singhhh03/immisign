import { z } from 'zod';
import {
  abnSchema,
  emailSchema,
  marnSchema,
  optionalEmailSchema,
  optionalPhoneSchema,
  personNameSchema,
  requiredMarnSchema,
  websiteSchema,
} from './fields';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  firstName: personNameSchema,
  lastName: personNameSchema,
  agencyName: z.string().trim().min(2, 'Agency name is required.').max(120),
  marn: marnSchema.optional(),
});

export const clientCreateSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  agency_id: z.string().uuid().optional(),
});

export const clientUpdateSchema = z
  .object({
    name: personNameSchema.optional(),
    email: emailSchema.optional(),
    phone: optionalPhoneSchema,
  })
  .refine((d) => d.name != null || d.email != null || d.phone !== undefined, {
    message: 'At least one field is required to update.',
  });

export const userProfileUpdateSchema = z.object({
  full_name: personNameSchema.optional(),
  phone: optionalPhoneSchema,
});

export const agencyProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Agency name is required.').max(120).optional(),
  principal_name: personNameSchema.optional(),
  marn: requiredMarnSchema.optional(),
  abn: abnSchema.optional(),
  email: optionalEmailSchema.optional(),
  phone: optionalPhoneSchema.optional(),
  website: websiteSchema.optional(),
  address: z.string().trim().max(500).optional().nullable(),
  timezone: z.string().trim().max(64).optional().nullable(),
});

/** Full agency profile form (settings business tab) */
export const agencyProfileSaveSchema = z.object({
  name: z.string().trim().min(2, 'Agency name is required.').max(120),
  principal_name: personNameSchema,
  marn: requiredMarnSchema,
  email: optionalEmailSchema.optional(),
  phone: optionalPhoneSchema.optional(),
  website: websiteSchema.optional(),
  address: z.string().trim().max(500).optional().nullable(),
});

export const teamInviteSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  role: z.string().trim().min(1, 'Role is required.'),
  marn: marnSchema.optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().uuid('Invalid invitation token.'),
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  fullName: personNameSchema,
  phone: optionalPhoneSchema.optional(),
});

export const rmaUpsertSchema = z.object({
  user_id: z.string().uuid(),
  mara_number: requiredMarnSchema,
  phone: optionalPhoneSchema.optional(),
  rma_tier: z.string().trim().max(32).optional(),
});

export const brandingPatchSchema = z
  .object({
    primary_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Brand colour must be a valid hex code.')
      .optional(),
    secondary_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary colour must be a valid hex code.')
      .optional(),
    logo_url: z.string().url().nullable().optional(),
    email_footer: z.string().max(2000).optional().nullable(),
    font_family: z.string().trim().max(64).optional(),
    agreement_ref_prefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,12}$/, 'Reference prefix must be 2–12 letters or numbers.')
      .optional(),
    agreement_ref_start: z.coerce
      .number()
      .int()
      .min(1, 'Starting number must be at least 1.')
      .max(99999999)
      .optional(),
    agreement_header_title: z.string().trim().min(1).max(200).optional(),
    agreement_footer_text: z.string().trim().max(2000).optional(),
  })
  .strict();

export const agreementWizardContactSchema = z.object({
  clientName: personNameSchema,
  clientEmail: emailSchema,
  clientPhone: optionalPhoneSchema,
});

export const agreementSchema = z.object({
  clientId: z.string().uuid('Invalid client ID.'),
  title: z.string().min(1, 'Title is required.'),
  metadata: z.record(z.string(), z.any()).optional(),
});

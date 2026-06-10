import { z } from 'zod';
import { emailSchema, personNameSchema, optionalPhoneSchema } from './fields';

const applicantBase = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  email: emailSchema,
  mobile: z.string().min(8, 'Mobile number is required').max(20),
});

export const onboardingCompleteSchema = z.object({
  primary: applicantBase.extend({
    address: z.string().min(3, 'Address is required'),
  }),
  hasSecondary: z.boolean(),
  secondary: applicantBase.optional().nullable(),
  matter: z.object({
    matterTypeId: z.string().uuid('Matter type is required'),
    visaSubclass: z.string().min(1, 'Visa subclass is required'),
    visaStream: z.string().min(1, 'Visa stream is required'),
    assignedAgentId: z.string().uuid('Assigned agent is required'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
  }),
  financial: z.object({
    professionalFee: z.number().min(0, 'Professional fees required'),
    deposit: z.number().min(0, 'Deposit required'),
    visaFees: z.number().min(0, 'Visa fees required'),
  }),
}).superRefine((data, ctx) => {
  if (data.hasSecondary) {
    if (!data.secondary) {
      ctx.addIssue({ code: 'custom', message: 'Secondary applicant details required', path: ['secondary'] });
      return;
    }
    const parsed = applicantBase.safeParse(data.secondary);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ['secondary', ...(issue.path || [])] });
      }
    }
  }
});

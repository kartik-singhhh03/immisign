import { z } from 'zod';

export const emailJobSchema = z.object({
  recipient: z.string().email(),
  type: z.enum(['agreement_sent', 'agreement_reminder', 'agreement_completed', 'welcome_email', 'security_alert']),
  agencyId: z.string().uuid(),
  payload: z.record(z.string(), z.any()), // dynamic specific to the email type
});

export const webhookPayloadSchema = z.object({
  type: z.string(),
  created_at: z.string(),
  data: z.object({
    email_id: z.string(),
    to: z.array(z.string()),
    tags: z.array(
       z.object({
           name: z.string(),
           value: z.string(),
       })
    ).optional(),
  }),
});

import { z } from 'zod';

export const checkoutRequestSchema = z.object({}).optional();

export const portalRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const seatPreviewQuerySchema = z.object({
  role: z.string().optional(),
});

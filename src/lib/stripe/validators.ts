import { z } from 'zod';
import { PlanName } from './plans';

export const checkoutRequestSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
});

export const portalRequestSchema = z.object({
    returnUrl: z.string().url().optional(),
});

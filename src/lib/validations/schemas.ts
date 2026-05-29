import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  fullName: z.string().min(2, 'Full name is required.'),
});

export const clientSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Invalid email address.'),
  visaType: z.string().optional(),
  phone: z.string().optional(),
});

export const agreementSchema = z.object({
  clientId: z.string().uuid('Invalid client ID.'),
  title: z.string().min(1, 'Title is required.'),
  metadata: z.record(z.any()).optional(),
});

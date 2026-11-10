import { z } from 'zod';

export const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Please provide a valid email address')
    .min(5)
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100)
    .optional(),
  brandName: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;


import { z } from 'zod';

export const requestEmailVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const confirmEmailVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;

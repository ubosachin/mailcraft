import { z } from 'zod';

export const startGuestSessionSchema = z.object({
  brandName: z.string().trim().min(1, 'Brand name must not be empty').max(100).optional(),
  senderEmail: z.string().trim().email('Invalid email address').optional(),
});

export const requestEmailVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const confirmEmailVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

export type StartGuestSessionInput = z.infer<typeof startGuestSessionSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;


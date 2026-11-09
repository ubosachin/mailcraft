import { z } from 'zod';

export const singleContactSchema = z.object({
  email: z.string().trim().email('Invalid email format').toLowerCase(),
  name: z.string().trim().max(100).optional(),
});

export const bulkContactImportSchema = z.object({
  contacts: z
    .array(singleContactSchema)
    .min(1, 'Please provide at least 1 contact')
    .max(5000, 'Maximum batch size is 5,000 contacts'),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm that all recipients gave explicit consent' }),
  }),
});

export const rawEmailsValidateSchema = z.object({
  rawInput: z.string().min(1, 'Please enter or paste at least one email address'),
});

export type SingleContactInput = z.infer<typeof singleContactSchema>;
export type BulkContactImportInput = z.infer<typeof bulkContactImportSchema>;
export type RawEmailsValidateInput = z.infer<typeof rawEmailsValidateSchema>;


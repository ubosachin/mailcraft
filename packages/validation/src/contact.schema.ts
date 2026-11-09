import { z } from 'zod';

export const consentStatusEnum = z.enum([
  'opted_in',
  'unknown',
  'unsubscribed',
  'suppressed',
]);

export const singleContactSchema = z.object({
  email: z.string().trim().email('Invalid email format').toLowerCase(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  name: z.string().trim().max(100).optional(),
  company: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
  consentStatus: consentStatusEnum.default('unknown'),
  consentSource: z.string().trim().max(100).default('manual_entry'),
  consentAt: z.union([z.string(), z.date()]).optional(),
  consentEvidence: z.string().trim().max(500).optional(),
  consentPolicyVersion: z.string().trim().max(20).optional(),
});

export const updateContactSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  name: z.string().trim().max(100).optional(),
  company: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
  consentStatus: consentStatusEnum.optional(),
  consentSource: z.string().trim().max(100).optional(),
  consentEvidence: z.string().trim().max(500).optional(),
});

export const bulkContactImportSchema = z.object({
  contacts: z
    .array(singleContactSchema)
    .min(1, 'Please provide at least 1 contact')
    .max(10000, 'Maximum batch size is 10,000 contacts'),
  consentConfirmed: z.boolean().default(false),
  consentEvidence: z.string().trim().max(500).optional(),
  defaultConsentStatus: consentStatusEnum.default('unknown'),
  tags: z.array(z.string().trim().max(50)).optional(),
});

export const rawEmailsValidateSchema = z.object({
  rawInput: z.string().min(1, 'Please enter or paste at least one email address'),
  checkDnsMx: z.boolean().optional().default(false),
});

export const createSegmentSchema = z.object({
  name: z.string().trim().min(1, 'Segment name is required').max(100),
  description: z.string().trim().max(300).optional(),
  filters: z.object({
    consentStatus: z.array(consentStatusEnum).optional(),
    importSource: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    company: z.string().trim().optional(),
    search: z.string().trim().optional(),
    createdAfter: z.union([z.string(), z.date()]).optional(),
    createdBefore: z.union([z.string(), z.date()]).optional(),
  }),
});

export const updateSegmentSchema = createSegmentSchema.partial();

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color')
    .default('#6366F1'),
});

export const updateTagSchema = createTagSchema.partial();

export type SingleContactInput = z.infer<typeof singleContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type BulkContactImportInput = z.infer<typeof bulkContactImportSchema>;
export type RawEmailsValidateInput = z.infer<typeof rawEmailsValidateSchema>;
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

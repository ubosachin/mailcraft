import { z } from 'zod';

export const analyticsFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  campaignId: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  eventType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const complianceValidateSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
});

export const dnsCheckSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3, 'Domain must be at least 3 characters')
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
});

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;
export type ComplianceValidateInput = z.infer<typeof complianceValidateSchema>;
export type DnsCheckInput = z.infer<typeof dnsCheckSchema>;


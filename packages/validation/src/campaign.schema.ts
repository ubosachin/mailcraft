import { z } from 'zod';

export const createCampaignSchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  campaignName: z.string().trim().min(2, 'Campaign name must be at least 2 characters').max(150),
  subject: z.string().trim().min(2, 'Subject line must be at least 2 characters').max(200),
  preheader: z.string().trim().max(200).optional(),
  templateId: z.string().optional(),
  editorData: z.record(z.unknown()).default({}),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const sendTestEmailSchema = z.object({
  testEmail: z.string().trim().email('Invalid test recipient address'),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;


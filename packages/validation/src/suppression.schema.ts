import { z } from 'zod';

export const suppressionReasonEnum = z.enum([
  'unsubscribe',
  'bounce',
  'hard_bounce',
  'soft_bounce_threshold',
  'complaint',
  'manual',
  'administrative',
]);

export const suppressionScopeEnum = z.enum(['global', 'session']);

export const addSuppressionSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  reason: suppressionReasonEnum.default('manual'),
  scope: suppressionScopeEnum.default('session'),
  notes: z.string().trim().max(500).optional(),
  reasonDetail: z.string().trim().max(500).optional(),
});

export const removeSuppressionSchema = z.object({
  auditReason: z.string().trim().min(3, 'Audit reason is required for suppression removal').max(300),
  force: z.boolean().optional().default(false),
});

export type AddSuppressionInput = z.infer<typeof addSuppressionSchema>;
export type RemoveSuppressionInput = z.infer<typeof removeSuppressionSchema>;

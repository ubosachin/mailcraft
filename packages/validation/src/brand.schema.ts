import { z } from 'zod';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const brandSchema = z.object({
  brandName: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(100),
  senderName: z.string().trim().min(2, 'Sender name must be at least 2 characters').max(100),
  senderEmail: z.string().trim().email('Invalid sender email address'),
  website: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrl: z.string().trim().url('Must be a valid logo URL').optional().or(z.literal('')),
  primaryColor: z.string().regex(hexColorRegex, 'Primary color must be a valid hex color code (e.g. #4F46E5)'),
  secondaryColor: z.string().regex(hexColorRegex, 'Secondary color must be a valid hex color code (e.g. #10B981)'),
  footerAddress: z.string().trim().max(300).optional(),
  socialLinks: z
    .object({
      twitter: z.string().trim().url().optional().or(z.literal('')),
      linkedin: z.string().trim().url().optional().or(z.literal('')),
      instagram: z.string().trim().url().optional().or(z.literal('')),
      website: z.string().trim().url().optional().or(z.literal('')),
    })
    .optional(),
});

export const updateBrandSchema = brandSchema.partial();

export type BrandInput = z.infer<typeof brandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;


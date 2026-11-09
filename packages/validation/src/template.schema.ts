import { z } from 'zod';

export const editorBlockTypeSchema = z.enum([
  'logo',
  'hero',
  'heading',
  'paragraph',
  'image',
  'button',
  'product_card',
  'product_grid',
  'discount_badge',
  'coupon',
  'social_links',
  'divider',
  'spacer',
  'two_column',
  'image_text',
  'feature_section',
  'announcement_bar',
  'footer',
  'unsubscribe',
]);

export const editorBlockSchema = z.object({
  id: z.string().min(1, 'Block ID is required'),
  type: editorBlockTypeSchema,
  props: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
});

export const editorSettingsSchema = z.object({
  background: z.string().optional(),
  backgroundColor: z.string().optional(),
  contentWidth: z.number().min(320).max(800).optional().default(600),
  fontFamily: z.string().optional(),
  textColor: z.string().optional(),
  headerBackground: z.string().optional(),
  footerBackground: z.string().optional(),
});

export const editorSchemaValidator = z.object({
  templateId: z.string().optional(),
  version: z.number().int().positive().optional().default(1),
  settings: editorSettingsSchema.default({ contentWidth: 600 }),
  blocks: z.array(editorBlockSchema).default([]),
});

export const templateCategorySchema = z.enum([
  'all',
  'ecommerce',
  'fashion',
  'technology',
  'food',
  'corporate',
  'festivals',
  'festival',
  'discounts',
  'product_launches',
  'product_launch',
  'welcome',
]);

export const renderTemplateRequestSchema = z.object({
  templateId: z.string().optional(),
  schema: editorSchemaValidator.optional(),
  brand: z
    .object({
      brandName: z.string().optional(),
      senderName: z.string().optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      website: z.string().optional(),
      footerAddress: z.string().optional(),
      socialLinks: z
        .object({
          twitter: z.string().optional(),
          instagram: z.string().optional(),
          linkedin: z.string().optional(),
          facebook: z.string().optional(),
          youtube: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  recipient: z
    .object({
      name: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      unsubscribeUrl: z.string().optional(),
    })
    .optional(),
  campaign: z
    .object({
      subject: z.string().optional(),
      preheader: z.string().optional(),
    })
    .optional(),
});

export const validateSchemaRequest = z.object({
  schema: editorSchemaValidator,
});

export type EditorSchemaInput = z.infer<typeof editorSchemaValidator>;
export type RenderTemplateRequestInput = z.infer<typeof renderTemplateRequestSchema>;


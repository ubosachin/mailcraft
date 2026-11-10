import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';

export interface PreviewBrandInput {
  brandName?: string;
  senderName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerAddress?: string;
  website?: string;
}

export const DEFAULT_PREVIEW_BRAND: Required<Omit<PreviewBrandInput, 'logoUrl'>> = {
  brandName: 'MailCraft Studio',
  senderName: 'Founder',
  primaryColor: '#4F46E5',
  secondaryColor: '#10B981',
  footerAddress: '100 Silicon Way, Suite 400, San Francisco, CA 94107',
  website: 'https://mailcraft.dev',
};

/**
 * Compiles a structured template schema into preview-safe responsive email HTML.
 */
export function compileTemplatePreview(
  options: {
    name: string;
    description?: string;
    editorSchema: IEditorSchema;
  },
  userBrand?: PreviewBrandInput | null
): string {
  const brand = {
    ...DEFAULT_PREVIEW_BRAND,
    ...(userBrand || {}),
  };

  const rendered = compileEmail({
    schema: options.editorSchema,
    brand,
    recipient: {
      name: 'Sarah Connor',
      firstName: 'Sarah',
      email: 'sarah@example.com',
      unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/sample_token',
    },
    campaign: {
      subject: `[Design Preview] ${options.name}`,
      preheader: options.description || 'Responsive email studio design preview',
    },
  });

  return rendered.html;
}

/**
 * Extracts up to three representative hex palette swatches from an email schema.
 */
export function extractTemplatePalette(schema: IEditorSchema): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];

  const pushColor = (val: unknown) => {
    if (typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return;
    const norm = trimmed.toUpperCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      colors.push(norm);
    }
  };

  pushColor(schema.settings?.background || schema.settings?.backgroundColor);
  for (const block of schema.blocks) {
    const props = block.props || block.data || {};
    pushColor(props.backgroundColor);
    pushColor(props.borderColor);
    pushColor(props.titleColor);
    if (colors.length >= 4) break;
  }

  return colors.slice(0, 3);
}


import { IEditorSchema, IEditorBlock } from '@mailcraft/shared-types';
import {
  RenderEmailOptions,
  RenderResult,
  BlockContext,
} from './types/template.types.js';
import { renderEmailLayout } from './components/EmailLayout.js';
import { renderEmailHeader } from './components/EmailHeader.js';
import { renderEmailFooter } from './components/EmailFooter.js';
import { renderHeroSection } from './components/HeroSection.js';
import { renderHeadingBlock } from './components/HeadingBlock.js';
import { renderParagraphBlock } from './components/ParagraphBlock.js';
import { renderImageBlock } from './components/ImageBlock.js';
import { renderButtonBlock } from './components/ButtonBlock.js';
import { renderCouponBlock } from './components/CouponBlock.js';
import { renderProductCard } from './components/ProductCard.js';
import { renderProductGrid } from './components/ProductGrid.js';
import { renderDiscountBadge } from './components/DiscountBadge.js';
import { renderSocialLinks } from './components/SocialLinks.js';
import { renderDividerBlock } from './components/DividerBlock.js';
import { renderUnsubscribeBlock } from './components/UnsubscribeBlock.js';
import { interpolateVariables } from './utils/variables.js';
import { getTemplateBySlug } from './registry/template-registry.js';

export function compileEmail(options: RenderEmailOptions): RenderResult {
  let schema = options.schema;

  // If no blocks provided or empty schema, try resolving via templateId
  if ((!schema || !schema.blocks || schema.blocks.length === 0) && schema?.templateId) {
    const tpl = getTemplateBySlug(schema.templateId);
    if (tpl) {
      schema = tpl.editorSchema;
    }
  }

  const defaultSettings = {
    background: '#F8F9FA',
    backgroundColor: '#F8F9FA',
    contentWidth: 600,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textColor: '#1A202C',
  };

  const settings = {
    ...defaultSettings,
    ...(schema?.settings || {}),
  };

  const primaryColor = options.brand?.primaryColor || '#4F46E5';
  const secondaryColor = options.brand?.secondaryColor || '#10B981';
  const contentWidth = Number(settings.contentWidth) || 600;
  const backgroundColor = settings.backgroundColor || settings.background || '#F8F9FA';
  const fontFamily = settings.fontFamily || defaultSettings.fontFamily;
  const defaultTextColor = settings.textColor || '#1A202C';

  const ctx: BlockContext = {
    primaryColor,
    secondaryColor,
    fontFamily,
    defaultTextColor,
    contentWidth,
    backgroundColor,
  };

  const htmlBlocks: string[] = [];
  const textBlocks: string[] = [];

  const blocks: IEditorBlock[] = Array.isArray(schema?.blocks) ? schema.blocks : [];

  for (const block of blocks) {
    const props = (block.props || block.data || {}) as Record<string, unknown>;

    let result = { html: '', text: '' };

    switch (block.type) {
      case 'logo':
        result = renderEmailHeader(props, options, ctx);
        break;
      case 'hero':
        result = renderHeroSection(props, options, ctx);
        break;
      case 'heading':
        result = renderHeadingBlock(props, options, ctx);
        break;
      case 'paragraph':
        result = renderParagraphBlock(props, options, ctx);
        break;
      case 'image':
        result = renderImageBlock(props, options, ctx);
        break;
      case 'button':
        result = renderButtonBlock(props, options, ctx);
        break;
      case 'coupon':
        result = renderCouponBlock(props, options, ctx);
        break;
      case 'product_card':
        result = renderProductCard(props, options, ctx);
        break;
      case 'product_grid':
        result = renderProductGrid(props, options, ctx);
        break;
      case 'discount_badge':
        result = renderDiscountBadge(props, options, ctx);
        break;
      case 'social_links':
        result = renderSocialLinks(props, options, ctx);
        break;
      case 'divider':
        result = renderDividerBlock(props, ctx);
        break;
      case 'footer':
        result = renderEmailFooter(props, options, ctx);
        break;
      case 'unsubscribe':
        result = renderUnsubscribeBlock(props, options, ctx);
        break;
      default:
        break;
    }

    if (result.html) htmlBlocks.push(result.html);
    if (result.text) textBlocks.push(result.text);
  }

  // Determine campaign title / subject
  const brandName = options.brand?.brandName || 'MailCraft';
  const subject = options.campaign?.subject || `${brandName} Announcement`;
  const preheader = options.campaign?.preheader || '';

  const emailHtml = renderEmailLayout({
    contentWidth,
    backgroundColor,
    fontFamily,
    defaultTextColor,
    title: subject,
    preheader: preheader ? interpolateVariables(preheader, options) : undefined,
    bodyContent: htmlBlocks.join('\n'),
  });

  return {
    html: emailHtml,
    text: textBlocks.join('\n\n').trim(),
    subject,
    preheader,
  };
}

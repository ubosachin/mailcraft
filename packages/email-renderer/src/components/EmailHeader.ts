import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export interface EmailHeaderProps {
  logoUrl?: string;
  altText?: string;
  width?: number;
  alignment?: 'center' | 'left' | 'right';
  backgroundColor?: string;
  padding?: string;
  brandText?: string;
  tagline?: string;
}

export function renderEmailHeader(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const brandName = options.brand?.brandName || (rawProps.brandText as string) || 'MailCraft';
  const logoSrc = options.brand?.logoUrl || (rawProps.logoUrl as string) || (rawProps.src as string) || '';
  const alt = (rawProps.altText as string) || (rawProps.alt as string) || brandName;
  const width = Number(rawProps.width) || 150;
  const align = (rawProps.alignment as string) || (rawProps.align as string) || 'center';
  const bg = (rawProps.backgroundColor as string) || 'transparent';
  const padding = (rawProps.padding as string) || '28px 32px 20px';
  const rawTagline = (rawProps.tagline as string) || '';
  const tagline = interpolateVariables(rawTagline, options);

  if (!logoSrc) {
    return {
      html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bg};">
        <tr>
          <td align="${align}" style="padding: ${padding};">
            <span style="font-size: 24px; font-weight: 800; color: ${ctx.primaryColor}; letter-spacing: -0.5px; text-decoration: none; font-family: ${ctx.fontFamily};">
              ${escapeHtml(brandName)}
            </span>
            ${
              tagline
                ? `<div style="font-size: 13px; color: #64748B; margin-top: 4px; font-weight: 500;">${escapeHtml(tagline)}</div>`
                : ''
            }
          </td>
        </tr>
      </table>`,
      text: `[${brandName}${tagline ? ' - ' + tagline : ''}]`,
    };
  }

  return {
    html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bg};">
      <tr>
        <td align="${align}" style="padding: ${padding};">
          <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(alt)}" width="${width}" style="display: block; max-width: 100%; height: auto; border: 0; margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0'};" />
          ${
            tagline
              ? `<div style="font-size: 13px; color: #64748B; margin-top: 6px; font-weight: 500;">${escapeHtml(tagline)}</div>`
              : ''
          }
        </td>
      </tr>
    </table>`,
    text: `[Logo: ${alt}]`,
  };
}


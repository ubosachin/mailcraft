import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderImageBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const src = (rawProps.src as string) || (rawProps.url as string) || (rawProps.image as string) || '';
  const alt = (rawProps.alt as string) || (rawProps.altText as string) || 'Image';
  const rawLinkUrl = (rawProps.linkUrl as string) || (rawProps.href as string) || '';
  const linkUrl = interpolateVariables(rawLinkUrl, options);
  const caption = (rawProps.caption as string) || '';
  const borderRadius = Number(rawProps.borderRadius ?? 8);
  const padding = (rawProps.padding as string) || '16px 32px';

  if (!src) return { html: '', text: '' };

  const imgTag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: ${borderRadius}px; border: 0;" />`;
  const linked = linkUrl
    ? `<a href="${escapeHtml(linkUrl)}" target="_blank" style="text-decoration: none; display: block;">${imgTag}</a>`
    : imgTag;

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: ${padding}; text-align: center;">
        ${linked}
        ${
          caption
            ? `<p style="margin: 8px 0 0; font-size: 13px; color: #64748B; text-align: center; font-family: ${ctx.fontFamily};">
                ${escapeHtml(caption)}
              </p>`
            : ''
        }
      </td>
    </tr>
  </table>`;

  const text = `[Image: ${alt} - ${src}]${caption ? ' (' + caption + ')' : ''}`;
  return { html, text };
}


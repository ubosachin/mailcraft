import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderAnnouncementBar(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawText = (rawProps.text as string) || 'Free standard shipping on all orders over $75';
  const text = interpolateVariables(rawText, options);
  const linkText = (rawProps.linkText as string) || '';
  const rawUrl = (rawProps.linkUrl as string) || (rawProps.url as string) || '';
  const url = interpolateVariables(rawUrl, options);

  const bg = (rawProps.backgroundColor as string) || ctx.primaryColor;
  const textColor = (rawProps.textColor as string) || '#FFFFFF';
  const padding = (rawProps.padding as string) || '10px 16px';
  const fontSize = Number(rawProps.fontSize) || 13;

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${escapeHtml(
    bg
  )};">
    <tr>
      <td align="center" style="padding: ${padding}; font-family: ${ctx.fontFamily}; font-size: ${fontSize}px; line-height: 1.4; color: ${escapeHtml(
    textColor
  )}; font-weight: 600; text-align: center;">
        ${escapeHtml(text)}
        ${
          url && linkText
            ? ` &bull; <a href="${escapeHtml(url)}" style="color: ${escapeHtml(
                textColor
              )}; text-decoration: underline; font-weight: 700;">${escapeHtml(linkText)} &rarr;</a>`
            : ''
        }
      </td>
    </tr>
  </table>`;

  const plainText = linkText && url ? `${text} - ${linkText}: ${url}` : text;
  return { html, text: plainText };
}


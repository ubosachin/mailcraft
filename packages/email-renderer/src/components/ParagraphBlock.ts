import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderParagraphBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawText = (rawProps.text as string) || (rawProps.content as string) || '';
  const text = interpolateVariables(rawText, options);
  const align = (rawProps.alignment as string) || (rawProps.align as string) || 'left';
  const color = (rawProps.color as string) || ctx.defaultTextColor;
  const fontSize = Number(rawProps.fontSize) || 15;
  const lineHeight = Number(rawProps.lineHeight) || 1.6;
  const padding = (rawProps.padding as string) || '8px 32px 16px';

  // Format newlines as <br /> while escaping HTML
  const formattedHtml = escapeHtml(text).replace(/\n/g, '<br />');

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="${align}" style="padding: ${padding}; font-size: ${fontSize}px; line-height: ${lineHeight}; color: ${color}; font-family: ${ctx.fontFamily};">
        ${formattedHtml}
      </td>
    </tr>
  </table>`;

  return { html, text };
}


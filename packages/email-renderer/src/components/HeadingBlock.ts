import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderHeadingBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawText = (rawProps.text as string) || (rawProps.title as string) || '';
  const text = interpolateVariables(rawText, options);
  const level = (rawProps.level as string) || 'h2';
  const align = (rawProps.alignment as string) || (rawProps.align as string) || 'left';
  const color = (rawProps.color as string) || ctx.defaultTextColor;
  const padding = (rawProps.padding as string) || '20px 32px 8px';

  let fontSize = '22px';
  if (level === 'h1') fontSize = '28px';
  if (level === 'h3') fontSize = '18px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <h2 style="margin: 0; font-size: ${fontSize}; font-weight: 700; line-height: 1.3; color: ${color}; font-family: ${ctx.fontFamily}; letter-spacing: -0.3px;">
          ${escapeHtml(text)}
        </h2>
      </td>
    </tr>
  </table>`;

  const textOutput = `\n### ${text}\n`;
  return { html, text: textOutput };
}


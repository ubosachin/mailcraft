import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderDiscountBadge(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawText = (rawProps.text as string) || (rawProps.label as string) || 'LIMITED TIME SALE';
  const text = interpolateVariables(rawText, options);
  const bg = (rawProps.backgroundColor as string) || '#EF4444';
  const textColor = (rawProps.textColor as string) || '#FFFFFF';
  const align = (rawProps.alignment as string) || 'center';
  const padding = (rawProps.padding as string) || '14px 32px 4px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0'};">
          <tr>
            <td align="center" bgcolor="${bg}" style="border-radius: 20px; padding: 6px 16px;">
              <span style="font-family: ${ctx.fontFamily}; font-size: 11px; font-weight: 800; color: ${textColor}; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">
                ${escapeHtml(text)}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return { html, text: `[${text}]` };
}


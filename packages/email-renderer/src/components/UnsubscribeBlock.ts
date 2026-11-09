import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderUnsubscribeBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawNotice = (rawProps.text as string) || (rawProps.notice as string) || 'You received this promotional message because you opted in to updates from {{brand_name}}.';
  const notice = interpolateVariables(rawNotice, options);
  const rawLabel = (rawProps.label as string) || 'Unsubscribe from this list';
  const label = interpolateVariables(rawLabel, options);
  const unsubUrl = options.recipient?.unsubscribeUrl || '#unsubscribe';
  const padding = (rawProps.padding as string) || '8px 32px 28px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: ${padding}; font-size: 11px; line-height: 1.5; color: #94A3B8; font-family: ${ctx.fontFamily};">
        <p style="margin: 0 0 6px;">
          ${escapeHtml(notice)}
        </p>
        <p style="margin: 0;">
          <a href="${escapeHtml(unsubUrl)}" target="_blank" style="color: #64748B; text-decoration: underline; font-weight: 500;">
            ${escapeHtml(label)}
          </a>
        </p>
      </td>
    </tr>
  </table>`;

  const text = `To unsubscribe: ${unsubUrl}`;
  return { html, text };
}


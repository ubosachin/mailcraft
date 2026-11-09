import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderEmailFooter(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const brandName = options.brand?.brandName || 'Our Brand';
  const rawSender = (rawProps.senderName as string) || options.brand?.senderName || brandName;
  const senderName = interpolateVariables(rawSender, options);

  const rawAddress = (rawProps.address as string) || (rawProps.footerAddress as string) || options.brand?.footerAddress || '123 Innovation Way, Suite 100';
  const address = interpolateVariables(rawAddress, options);

  const bg = (rawProps.backgroundColor as string) || 'transparent';
  const borderTop = (rawProps.borderTop as string) || '1px solid #E2E8F0';
  const padding = (rawProps.padding as string) || '24px 32px 12px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bg}; border-top: ${borderTop};">
    <tr>
      <td align="center" style="padding: ${padding}; font-size: 12px; line-height: 1.6; color: #64748B; font-family: ${ctx.fontFamily};">
        <p style="margin: 0 0 4px; font-weight: 700; color: #334155;">
          ${escapeHtml(senderName)}
        </p>
        ${
          address
            ? `<p style="margin: 0 0 6px;">
                ${escapeHtml(address)}
              </p>`
            : ''
        }
        <p style="margin: 0; font-size: 11px; color: #94A3B8;">
          &copy; ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>`;

  const text = `\n---\n${senderName}\n${address}\n`;
  return { html, text };
}


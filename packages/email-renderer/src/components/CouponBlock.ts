import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderCouponBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawCode = (rawProps.code as string) || (rawProps.couponCode as string) || 'OFFER20';
  const code = interpolateVariables(rawCode, options);

  const rawDiscount = (rawProps.discount as string) || (rawProps.discountTitle as string) || '20% OFF';
  const discount = interpolateVariables(rawDiscount, options);

  const rawDescription = (rawProps.description as string) || (rawProps.subtitle as string) || 'Limited time offer';
  const description = interpolateVariables(rawDescription, options);

  const bg = (rawProps.backgroundColor as string) || '#FFFBEB';
  const border = (rawProps.borderColor as string) || '#F59E0B';
  const textColor = (rawProps.textColor as string) || '#0F172A';
  const padding = (rawProps.padding as string) || '16px 32px 24px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: ${padding};">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bg}; border: 2px dashed ${border}; border-radius: 10px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 800; color: ${border}; text-transform: uppercase; letter-spacing: 1.5px; font-family: ${ctx.fontFamily};">
                Special Offer
              </p>
              <h3 style="margin: 0 0 8px; font-size: 26px; font-weight: 800; color: ${textColor}; font-family: ${ctx.fontFamily}; letter-spacing: -0.5px;">
                ${escapeHtml(discount)}
              </h3>
              ${
                description
                  ? `<p style="margin: 0 0 16px; font-size: 14px; color: #64748B; font-family: ${ctx.fontFamily}; max-width: 420px;">
                      ${escapeHtml(description)}
                    </p>`
                  : ''
              }
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 22px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: 3px;">
                      ${escapeHtml(code)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const text = `--- EXCLUSIVE COUPON: ${code} (${discount}) ---\n${description ? description + '\n' : ''}`;
  return { html, text };
}


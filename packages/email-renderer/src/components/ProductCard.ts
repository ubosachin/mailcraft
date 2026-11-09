import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderProductCard(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawTitle = (rawProps.title as string) || (rawProps.name as string) || 'Featured Item';
  const title = interpolateVariables(rawTitle, options);
  const price = (rawProps.price as string) || '$0.00';
  const originalPrice = (rawProps.originalPrice as string) || '';
  const img = (rawProps.imageUrl as string) || (rawProps.image as string) || '';
  const rawBtnText = (rawProps.buttonText as string) || 'Shop Item';
  const btnText = interpolateVariables(rawBtnText, options);
  const rawUrl = (rawProps.url as string) || (rawProps.href as string) || options.brand?.website || '#';
  const url = interpolateVariables(rawUrl, options);
  const rawDesc = (rawProps.description as string) || '';
  const desc = interpolateVariables(rawDesc, options);
  const padding = (rawProps.padding as string) || '12px 32px 20px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: ${padding};">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; background-color: #FFFFFF;">
          ${
            img
              ? `<tr>
                  <td align="center" style="padding: 16px 16px 0;">
                    <a href="${escapeHtml(url)}" target="_blank" style="text-decoration: none;">
                      <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" style="display: block; width: 100%; max-width: 100%; height: auto; max-height: 240px; border-radius: 8px; object-fit: cover;" />
                    </a>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 20px; text-align: center;">
              <h4 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0F172A; font-family: ${ctx.fontFamily};">
                ${escapeHtml(title)}
              </h4>
              ${
                desc
                  ? `<p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748B; font-family: ${ctx.fontFamily};">
                      ${escapeHtml(desc)}
                    </p>`
                  : ''
              }
              <div style="margin: 0 0 16px;">
                <span style="font-size: 20px; font-weight: 800; color: ${ctx.primaryColor}; font-family: ${ctx.fontFamily};">
                  ${escapeHtml(price)}
                </span>
                ${
                  originalPrice
                    ? `<span style="font-size: 14px; color: #94A3B8; text-decoration: line-through; margin-left: 8px; font-family: ${ctx.fontFamily};">
                        ${escapeHtml(originalPrice)}
                      </span>`
                    : ''
                }
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${ctx.primaryColor}" style="border-radius: 6px;">
                    <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 10px 24px; font-family: ${ctx.fontFamily}; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 6px;">
                      ${escapeHtml(btnText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const text = `Product: ${title} - Price: ${price}${originalPrice ? ' (Was: ' + originalPrice + ')' : ''} (Shop: ${url})`;
  return { html, text };
}


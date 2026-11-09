import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export interface ProductItem {
  title: string;
  price: string;
  originalPrice?: string;
  imageUrl?: string;
  url?: string;
  buttonText?: string;
}

export function renderProductGrid(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const items = (rawProps.products as ProductItem[]) || (rawProps.items as ProductItem[]) || [];
  const padding = (rawProps.padding as string) || '16px 24px';

  if (!items || items.length === 0) {
    return { html: '', text: '' };
  }

  const textLines: string[] = [];

  // Group into pairs of 2
  const rows: ProductItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  const rowsHtml = rows
    .map((row) => {
      const colWidth = 265;
      const leftItem = row[0];
      const rightItem = row[1];

      const renderCard = (item: ProductItem) => {
        const title = interpolateVariables(item.title || 'Product', options);
        const price = item.price || '$0.00';
        const originalPrice = item.originalPrice || '';
        const img = item.imageUrl || '';
        const url = interpolateVariables(item.url || options.brand?.website || '#', options);
        const btnText = interpolateVariables(item.buttonText || 'Shop', options);

        textLines.push(`- ${title} (${price}) -> ${url}`);

        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
          ${
            img
              ? `<tr>
                  <td align="center" style="padding: 12px 12px 0;">
                    <a href="${escapeHtml(url)}" target="_blank" style="text-decoration: none;">
                      <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" style="display: block; width: 100%; max-width: 100%; height: auto; max-height: 160px; border-radius: 6px; object-fit: cover;" />
                    </a>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 14px; text-align: center;">
              <h5 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #0F172A; font-family: ${ctx.fontFamily};">
                ${escapeHtml(title)}
              </h5>
              <div style="margin: 0 0 10px;">
                <span style="font-size: 15px; font-weight: 800; color: ${ctx.primaryColor}; font-family: ${ctx.fontFamily};">
                  ${escapeHtml(price)}
                </span>
                ${
                  originalPrice
                    ? `<span style="font-size: 12px; color: #94A3B8; text-decoration: line-through; margin-left: 6px;">
                        ${escapeHtml(originalPrice)}
                      </span>`
                    : ''
                }
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${ctx.primaryColor}" style="border-radius: 4px;">
                    <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 7px 16px; font-family: ${ctx.fontFamily}; font-size: 12px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 4px;">
                      ${escapeHtml(btnText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
      };

      return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
        <tr>
          <!--[if mso]>
          <td width="${colWidth}" valign="top" style="padding-right: 10px;">
          <![endif]-->
          <td class="mobile-stack" width="${colWidth}" valign="top" style="padding: 0 8px 16px 8px;">
            ${renderCard(leftItem)}
          </td>
          <!--[if mso]>
          </td>
          <td width="${colWidth}" valign="top" style="padding-left: 10px;">
          <![endif]-->
          ${
            rightItem
              ? `<td class="mobile-stack" width="${colWidth}" valign="top" style="padding: 0 8px 16px 8px;">
                  ${renderCard(rightItem)}
                </td>`
              : `<td class="mobile-stack mobile-hide" width="${colWidth}" valign="top" style="padding: 0 8px 16px 8px;"></td>`
          }
          <!--[if mso]>
          </td>
          <![endif]-->
        </tr>
      </table>`;
    })
    .join('\n');

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: ${padding};">
        ${rowsHtml}
      </td>
    </tr>
  </table>`;

  return { html, text: textLines.join('\n') };
}


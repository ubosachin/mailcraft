import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderSocialLinks(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const brandSocial = options.brand?.socialLinks || {};
  const twitter = (rawProps.twitter as string) || brandSocial.twitter || '';
  const instagram = (rawProps.instagram as string) || brandSocial.instagram || '';
  const linkedin = (rawProps.linkedin as string) || brandSocial.linkedin || '';
  const facebook = (rawProps.facebook as string) || brandSocial.facebook || '';
  const website = (rawProps.website as string) || options.brand?.website || '';
  const padding = (rawProps.padding as string) || '16px 32px 12px';

  const links: Array<{ name: string; url: string }> = [];
  if (website) links.push({ name: 'Website', url: website });
  if (twitter) links.push({ name: 'Twitter/X', url: twitter });
  if (instagram) links.push({ name: 'Instagram', url: instagram });
  if (linkedin) links.push({ name: 'LinkedIn', url: linkedin });
  if (facebook) links.push({ name: 'Facebook', url: facebook });

  if (links.length === 0) {
    // Default fallback brand link
    links.push({
      name: options.brand?.brandName || 'Our Website',
      url: options.brand?.website || 'https://example.com',
    });
  }

  const itemsHtml = links
    .map(
      (l) => `<td style="padding: 0 10px;">
        <a href="${escapeHtml(interpolateVariables(l.url, options))}" target="_blank" style="font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; font-family: ${ctx.fontFamily};">
          ${escapeHtml(l.name)}
        </a>
      </td>`
    )
    .join('\n');

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: ${padding};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            ${itemsHtml}
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const text = links.map((l) => `${l.name}: ${l.url}`).join(' | ');
  return { html, text };
}


import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderHeroSection(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawTitle = (rawProps.title as string) || '';
  const rawSubtitle = (rawProps.subtitle as string) || '';
  const title = interpolateVariables(rawTitle, options);
  const subtitle = interpolateVariables(rawSubtitle, options);

  const bg = (rawProps.backgroundColor as string) || '#F8FAFC';
  const titleColor = (rawProps.titleColor as string) || '#0F172A';
  const subtitleColor = (rawProps.subtitleColor as string) || '#475569';
  const imageUrl = (rawProps.image as string) || (rawProps.imageUrl as string) || '';
  const imageAlt = (rawProps.imageAlt as string) || title || 'Hero Banner';
  const align = (rawProps.alignment as string) || 'center';
  const padding = (rawProps.padding as string) || '40px 32px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bg};">
    ${
      imageUrl
        ? `<tr>
            <td align="center" style="padding: 0 0 24px 0;">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" style="display: block; width: 100%; max-width: 100%; height: auto; border: 0;" />
            </td>
          </tr>`
        : ''
    }
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <h1 style="margin: 0 0 12px; font-size: 30px; font-weight: 800; line-height: 1.25; color: ${titleColor}; letter-spacing: -0.5px; font-family: ${ctx.fontFamily};">
          ${escapeHtml(title)}
        </h1>
        ${
          subtitle
            ? `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${subtitleColor}; max-width: 520px; font-family: ${ctx.fontFamily};">
                ${escapeHtml(subtitle)}
              </p>`
            : ''
        }
      </td>
    </tr>
  </table>`;

  const text = `${title}\n${subtitle ? subtitle + '\n' : ''}`;
  return { html, text };
}


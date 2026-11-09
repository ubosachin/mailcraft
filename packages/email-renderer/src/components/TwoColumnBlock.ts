import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderTwoColumnBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const col1Title = interpolateVariables((rawProps.col1Title as string) || 'Curated Picks', options);
  const col1Text = interpolateVariables(
    (rawProps.col1Text as string) || 'Handpicked artisan essentials crafted with sustainable materials.',
    options
  );
  const col1LinkText = (rawProps.col1LinkText as string) || 'Explore';
  const col1Url = interpolateVariables((rawProps.col1Url as string) || 'https://example.com', options);

  const col2Title = interpolateVariables((rawProps.col2Title as string) || 'Fast Delivery', options);
  const col2Text = interpolateVariables(
    (rawProps.col2Text as string) || 'Next-day tracked courier dispatch directly to your doorstep.',
    options
  );
  const col2LinkText = (rawProps.col2LinkText as string) || 'Learn More';
  const col2Url = interpolateVariables((rawProps.col2Url as string) || 'https://example.com', options);

  const bg = (rawProps.backgroundColor as string) || '#FFFFFF';
  const padding = (rawProps.padding as string) || '24px 20px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${escapeHtml(
    bg
  )};">
    <tr>
      <td style="padding: ${padding};">
        <!--[if mso]>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr><td width="50%" valign="top">
        <![endif]-->
        <table role="presentation" class="col-half" align="left" border="0" cellpadding="0" cellspacing="0" width="48%" style="max-width: 270px; display: inline-block; vertical-align: top; margin-bottom: 16px;">
          <tr>
            <td style="font-family: ${ctx.fontFamily}; padding: 12px 14px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #1E293B;">${escapeHtml(
                col1Title
              )}</h3>
              <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #64748B;">${escapeHtml(
                col1Text
              )}</p>
              ${
                col1LinkText && col1Url
                  ? `<a href="${escapeHtml(
                      col1Url
                    )}" style="font-size: 13px; font-weight: 600; color: ${ctx.primaryColor}; text-decoration: none;">${escapeHtml(
                      col1LinkText
                    )} &rarr;</a>`
                  : ''
              }
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td><td width="50%" valign="top">
        <![endif]-->
        <table role="presentation" class="col-half" align="right" border="0" cellpadding="0" cellspacing="0" width="48%" style="max-width: 270px; display: inline-block; vertical-align: top; margin-bottom: 16px;">
          <tr>
            <td style="font-family: ${ctx.fontFamily}; padding: 12px 14px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #1E293B;">${escapeHtml(
                col2Title
              )}</h3>
              <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #64748B;">${escapeHtml(
                col2Text
              )}</p>
              ${
                col2LinkText && col2Url
                  ? `<a href="${escapeHtml(
                      col2Url
                    )}" style="font-size: 13px; font-weight: 600; color: ${ctx.primaryColor}; text-decoration: none;">${escapeHtml(
                      col2LinkText
                    )} &rarr;</a>`
                  : ''
              }
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>`;

  const text = `${col1Title}\n${col1Text}\n${col1Url}\n\n${col2Title}\n${col2Text}\n${col2Url}`;
  return { html, text };
}


import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderImageTextBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const imageSrc =
    (rawProps.imageSrc as string) ||
    (rawProps.image as string) ||
    (rawProps.src as string) ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  const alt = (rawProps.alt as string) || 'Featured Item';
  const heading = interpolateVariables((rawProps.heading as string) || 'Crafted With Intention', options);
  const text = interpolateVariables(
    (rawProps.text as string) ||
      'Every subtle contour is machined to exact tolerances, delivering balance, durability, and understated elegance.',
    options
  );
  const buttonText = (rawProps.buttonText as string) || 'Discover More';
  const rawUrl = (rawProps.buttonUrl as string) || (rawProps.url as string) || 'https://example.com';
  const url = interpolateVariables(rawUrl, options);
  const imagePosition = (rawProps.imagePosition as string) === 'right' ? 'right' : 'left';
  const bg = (rawProps.backgroundColor as string) || '#FFFFFF';
  const padding = (rawProps.padding as string) || '24px 20px';

  const imageTable = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(
    alt
  )}" width="250" style="display: block; width: 100%; max-width: 250px; height: auto; border-radius: 6px;" />
      </td>
    </tr>
  </table>`;

  const copyTable = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="font-family: ${ctx.fontFamily}; padding: 10px 14px;">
        <h3 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #1E293B; line-height: 1.3;">
          ${escapeHtml(heading)}
        </h3>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #64748B;">
          ${escapeHtml(text)}
        </p>
        ${
          buttonText
            ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="${ctx.primaryColor}" style="border-radius: 6px;">
                    <a href="${escapeHtml(
                      url
                    )}" target="_blank" style="font-family: ${ctx.fontFamily}; font-size: 13px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 10px 20px; display: inline-block;">
                      ${escapeHtml(buttonText)}
                    </a>
                  </td>
                </tr>
              </table>`
            : ''
        }
      </td>
    </tr>
  </table>`;

  const leftCol = imagePosition === 'left' ? imageTable : copyTable;
  const rightCol = imagePosition === 'left' ? copyTable : imageTable;

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${escapeHtml(
    bg
  )};">
    <tr>
      <td style="padding: ${padding};">
        <!--[if mso]>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr><td width="50%" valign="top">
        <![endif]-->
        <table role="presentation" class="col-half" align="left" border="0" cellpadding="0" cellspacing="0" width="48%" style="max-width: 265px; display: inline-block; vertical-align: middle; margin-bottom: 12px;">
          <tr><td>${leftCol}</td></tr>
        </table>
        <!--[if mso]>
        </td><td width="50%" valign="top">
        <![endif]-->
        <table role="presentation" class="col-half" align="right" border="0" cellpadding="0" cellspacing="0" width="48%" style="max-width: 265px; display: inline-block; vertical-align: middle; margin-bottom: 12px;">
          <tr><td>${rightCol}</td></tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>`;

  const plainText = `${heading}\n${text}\n${buttonText}: ${url}`;
  return { html, text: plainText };
}


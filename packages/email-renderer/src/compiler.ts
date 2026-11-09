import { IEditorSchema, IEditorBlock } from '@mailcraft/shared-types';

export interface RenderEmailOptions {
  schema: IEditorSchema;
  brand?: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  };
  recipient?: {
    name?: string;
    email?: string;
    unsubscribeUrl?: string;
  };
}

export interface RenderResult {
  html: string;
  text: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function interpolateVariables(
  text: string,
  options: RenderEmailOptions
): string {
  const brandName = options.brand?.brandName || 'Our Brand';
  const footerAddress = options.brand?.footerAddress || '123 Business Way, Suite 100';
  const recipientName = options.recipient?.name || 'Customer';
  const unsubscribeUrl = options.recipient?.unsubscribeUrl || '#unsubscribe';

  return text
    .replace(/{{\s*recipient_name\s*}}/gi, recipientName)
    .replace(/{{\s*brand_name\s*}}/gi, brandName)
    .replace(/{{\s*footer_address\s*}}/gi, footerAddress)
    .replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl);
}

export function compileEmail(options: RenderEmailOptions): RenderResult {
  const { schema, brand } = options;
  const settings = schema.settings || {
    background: '#F8F9FA',
    contentWidth: 600,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textColor: '#1A202C',
  };

  const primaryColor = brand?.primaryColor || '#4F46E5';
  const secondaryColor = brand?.secondaryColor || '#10B981';
  const contentWidth = settings.contentWidth || 600;
  const backgroundColor = settings.background || '#F8F9FA';
  const fontFamily = settings.fontFamily;
  const defaultTextColor = settings.textColor || '#1A202C';

  const htmlBlocks: string[] = [];
  const textBlocks: string[] = [];

  const blocks = Array.isArray(schema?.blocks) ? schema.blocks : [];
  for (const block of blocks) {
    const rendered = renderBlock(block, options, {
      primaryColor,
      secondaryColor,
      fontFamily,
      defaultTextColor,
    });
    if (rendered.html) htmlBlocks.push(rendered.html);
    if (rendered.text) textBlocks.push(rendered.text);
  }

  const emailHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(brand?.brandName || 'Promotional Campaign')}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${backgroundColor}; }
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-4 { padding: 16px !important; }
      .mobile-full-width { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: ${backgroundColor}; font-family: ${fontFamily}; color: ${defaultTextColor};">
  <!--[if mso]>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${contentWidth}" align="center">
  <tr>
  <td>
  <![endif]-->
  <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: ${contentWidth}px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.06);">
    <tr>
      <td style="padding: 0;">
        ${htmlBlocks.join('\n')}
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->
</body>
</html>`;

  return {
    html: emailHtml,
    text: textBlocks.join('\n\n').trim(),
  };
}

interface BlockContext {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  defaultTextColor: string;
}

function renderBlock(
  block: IEditorBlock,
  options: RenderEmailOptions,
  ctx: BlockContext
): { html: string; text: string } {
  const d = block.data || {};

  switch (block.type) {
    case 'logo': {
      const src = options.brand?.logoUrl || (d.src as string) || '';
      const alt = (d.alt as string) || options.brand?.brandName || 'Logo';
      const width = Number(d.width) || 140;
      const align = (d.align as string) || 'center';

      if (!src) {
        const brandName = options.brand?.brandName || 'MailCraft';
        return {
          html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="${align}" style="padding: 24px 32px 16px;">
                <span style="font-size: 22px; font-weight: 800; color: ${ctx.primaryColor}; letter-spacing: -0.5px; text-decoration: none;">${escapeHtml(brandName)}</span>
              </td>
            </tr>
          </table>`,
          text: `[${brandName}]`,
        };
      }

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="${align}" style="padding: 24px 32px 16px;">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" style="display: block; max-width: 100%; height: auto; border: 0;" />
            </td>
          </tr>
        </table>`,
        text: `[Logo: ${alt}]`,
      };
    }

    case 'hero': {
      const title = interpolateVariables((d.title as string) || '', options);
      const subtitle = interpolateVariables((d.subtitle as string) || '', options);
      const bg = (d.backgroundColor as string) || '#F8FAFC';
      const titleColor = (d.titleColor as string) || '#0F172A';
      const subtitleColor = (d.subtitleColor as string) || '#475569';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 36px 32px; background-color: ${bg}; text-align: center;">
              <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 800; line-height: 1.25; color: ${titleColor}; letter-spacing: -0.5px;">${escapeHtml(title)}</h1>
              ${subtitle ? `<p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${subtitleColor};">${escapeHtml(subtitle)}</p>` : ''}
            </td>
          </tr>
        </table>`,
        text: `${title}\n${subtitle ? subtitle + '\n' : ''}`,
      };
    }

    case 'heading': {
      const text = interpolateVariables((d.text as string) || '', options);
      const level = (d.level as string) || 'h2';
      const align = (d.align as string) || 'left';
      const color = (d.color as string) || ctx.defaultTextColor;
      const size = level === 'h1' ? '24px' : level === 'h2' ? '20px' : '17px';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="${align}" style="padding: 16px 32px 8px;">
              <h2 style="margin: 0; font-size: ${size}; font-weight: 700; line-height: 1.3; color: ${color};">${escapeHtml(text)}</h2>
            </td>
          </tr>
        </table>`,
        text: `\n### ${text}\n`,
      };
    }

    case 'paragraph': {
      const rawText = (d.text as string) || '';
      const text = interpolateVariables(rawText, options);
      const align = (d.align as string) || 'left';
      const color = (d.color as string) || ctx.defaultTextColor;
      const fontSize = (d.fontSize as number) || 15;
      const lineHeight = (d.lineHeight as number) || 1.6;

      const formatted = escapeHtml(text).replace(/\n/g, '<br />');

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="${align}" style="padding: 8px 32px 16px; font-size: ${fontSize}px; line-height: ${lineHeight}; color: ${color};">
              ${formatted}
            </td>
          </tr>
        </table>`,
        text: text,
      };
    }

    case 'image': {
      const src = (d.src as string) || '';
      const alt = (d.alt as string) || 'Image';
      const url = (d.url as string) || '';
      const caption = (d.caption as string) || '';

      if (!src) return { html: '', text: '' };

      const imgTag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: 8px;" />`;
      const linked = url ? `<a href="${escapeHtml(url)}" target="_blank" style="text-decoration: none;">${imgTag}</a>` : imgTag;

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 32px;">
              ${linked}
              ${caption ? `<p style="margin: 6px 0 0; font-size: 12px; color: #64748B; text-align: center;">${escapeHtml(caption)}</p>` : ''}
            </td>
          </tr>
        </table>`,
        text: `[Image: ${alt} - ${src}]`,
      };
    }

    case 'button': {
      const text = (d.text as string) || 'Learn More';
      const url = interpolateVariables((d.url as string) || '#', options);
      const bg = (d.backgroundColor as string) || ctx.primaryColor;
      const textColor = (d.textColor as string) || '#FFFFFF';
      const radius = Number(d.borderRadius) ?? 6;
      const align = (d.align as string) || 'center';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="${align}" style="padding: 16px 32px 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0'};">
                <tr>
                  <td align="center" bgcolor="${bg}" style="border-radius: ${radius}px;">
                    <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: ${ctx.fontFamily}; font-size: 15px; font-weight: 700; color: ${textColor}; text-decoration: none; border-radius: ${radius}px; letter-spacing: 0.2px;">
                      ${escapeHtml(text)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`,
        text: `>> ${text}: ${url} <<`,
      };
    }

    case 'coupon': {
      const code = (d.code as string) || 'SAVE10';
      const discount = (d.discount as string) || '10% OFF';
      const description = (d.description as string) || '';
      const bg = (d.backgroundColor as string) || '#FFFBEB';
      const border = (d.borderColor as string) || '#F59E0B';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 32px 24px;">
              <div style="background-color: ${bg}; border: 2px dashed ${border}; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: ${border}; text-transform: uppercase; letter-spacing: 1px;">Exclusive Offer</p>
                <h3 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #1E293B;">${escapeHtml(discount)}</h3>
                ${description ? `<p style="margin: 0 0 14px; font-size: 13px; color: #64748B;">${escapeHtml(description)}</p>` : ''}
                <div style="display: inline-block; background-color: #FFFFFF; border: 1px solid #CBD5E1; padding: 8px 16px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: 2px;">
                  ${escapeHtml(code)}
                </div>
              </div>
            </td>
          </tr>
        </table>`,
        text: `--- COUPON CODE: ${code} (${discount}) ---`,
      };
    }

    case 'discount_badge': {
      const text = (d.text as string) || 'SALE';
      const bg = (d.backgroundColor as string) || '#EF4444';
      const textColor = (d.textColor as string) || '#FFFFFF';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 12px 32px 4px;">
              <span style="display: inline-block; padding: 6px 14px; background-color: ${bg}; color: ${textColor}; font-size: 12px; font-weight: 800; border-radius: 20px; letter-spacing: 0.8px; text-transform: uppercase;">
                ${escapeHtml(text)}
              </span>
            </td>
          </tr>
        </table>`,
        text: `[${text}]`,
      };
    }

    case 'product_card': {
      const title = (d.title as string) || 'Featured Item';
      const price = (d.price as string) || '$0.00';
      const originalPrice = (d.originalPrice as string) || '';
      const img = (d.imageUrl as string) || '';
      const btnText = (d.buttonText as string) || 'Shop Item';
      const url = (d.url as string) || '#';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 12px 32px 20px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
                ${img ? `<tr>
                  <td align="center" style="padding: 16px 16px 0;">
                    <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" style="display: block; max-width: 100%; height: auto; max-height: 220px; border-radius: 6px;" />
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0F172A;">${escapeHtml(title)}</h4>
                    <div style="margin: 0 0 12px;">
                      <span style="font-size: 18px; font-weight: 800; color: ${ctx.primaryColor};">${escapeHtml(price)}</span>
                      ${originalPrice ? `<span style="font-size: 14px; color: #94A3B8; text-decoration: line-through; margin-left: 6px;">${escapeHtml(originalPrice)}</span>` : ''}
                    </div>
                    <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 10px 20px; font-size: 13px; font-weight: 700; color: #FFFFFF; background-color: ${ctx.primaryColor}; text-decoration: none; border-radius: 6px;">
                      ${escapeHtml(btnText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`,
        text: `Product: ${title} - Price: ${price} (Shop: ${url})`,
      };
    }

    case 'footer': {
      const senderName = interpolateVariables((d.senderName as string) || options.brand?.brandName || 'Sender', options);
      const address = interpolateVariables((d.address as string) || options.brand?.footerAddress || '', options);

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E2E8F0;">
          <tr>
            <td style="padding: 24px 32px 12px; text-align: center; font-size: 12px; line-height: 1.5; color: #64748B;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #334155;">${escapeHtml(senderName)}</p>
              ${address ? `<p style="margin: 0 0 4px;">${escapeHtml(address)}</p>` : ''}
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${escapeHtml(senderName)}. All rights reserved.</p>
            </td>
          </tr>
        </table>`,
        text: `\n---\n${senderName}\n${address}\n`,
      };
    }

    case 'unsubscribe': {
      const text = interpolateVariables((d.text as string) || 'You received this email because you opted in to marketing updates.', options);
      const unsubUrl = options.recipient?.unsubscribeUrl || '#unsubscribe';

      return {
        html: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 32px 28px; text-align: center; font-size: 11px; line-height: 1.5; color: #94A3B8;">
              <p style="margin: 0 0 6px;">${escapeHtml(text)}</p>
              <p style="margin: 0;">
                <a href="${escapeHtml(unsubUrl)}" target="_blank" style="color: #64748B; text-decoration: underline;">
                  Unsubscribe from this list
                </a>
              </p>
            </td>
          </tr>
        </table>`,
        text: `To unsubscribe, visit: ${unsubUrl}`,
      };
    }

    default:
      return { html: '', text: '' };
  }
}


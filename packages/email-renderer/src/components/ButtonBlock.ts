import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

export function renderButtonBlock(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const rawText = (rawProps.text as string) || (rawProps.label as string) || 'Shop Now';
  const text = interpolateVariables(rawText, options);
  const rawUrl = (rawProps.url as string) || (rawProps.href as string) || options.brand?.website || '#';
  const url = interpolateVariables(rawUrl, options);

  const bg = (rawProps.backgroundColor as string) || ctx.primaryColor;
  const textColor = (rawProps.textColor as string) || '#FFFFFF';
  const radius = Number(rawProps.borderRadius ?? 6);
  const align = (rawProps.alignment as string) || (rawProps.align as string) || 'center';
  const padding = (rawProps.padding as string) || '18px 32px 24px';
  const fullWidth = Boolean(rawProps.fullWidth);

  const marginAlign =
    align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: ${marginAlign}; width: ${fullWidth ? '100%' : 'auto'};">
          <tr>
            <td align="center" bgcolor="${bg}" style="border-radius: ${radius}px;">
              <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px ${fullWidth ? '16px' : '32px'}; font-family: ${ctx.fontFamily}; font-size: 15px; font-weight: 700; color: ${textColor}; text-decoration: none; border-radius: ${radius}px; letter-spacing: 0.3px; text-align: center; width: ${fullWidth ? '100%' : 'auto'}; box-sizing: border-box;">
                ${escapeHtml(text)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const textOutput = `>> ${text}: ${url} <<`;
  return { html, text: textOutput };
}


import { escapeHtml } from '../utils/escape.js';
import { interpolateVariables } from '../utils/variables.js';
import { BlockContext, BlockRenderResult, RenderEmailOptions } from '../types/template.types.js';

interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
}

export function renderFeatureSection(
  rawProps: Record<string, unknown>,
  options: RenderEmailOptions,
  ctx: BlockContext
): BlockRenderResult {
  const sectionTitle = interpolateVariables(
    (rawProps.title as string) || (rawProps.sectionTitle as string) || 'Why Leading Brands Choose Us',
    options
  );

  const defaultFeatures: FeatureItem[] = [
    {
      icon: '✦',
      title: 'Precision Craft',
      description: 'Manufactured with aerospace-grade tolerances.',
    },
    {
      icon: '🛡',
      title: 'Lifetime Guarantee',
      description: 'Zero hassle replacement on craftsmanship defects.',
    },
    {
      icon: '⚡',
      title: 'Express Dispatch',
      description: 'Insured worldwide delivery within 48 hours.',
    },
  ];

  const features: FeatureItem[] = Array.isArray(rawProps.features)
    ? (rawProps.features as FeatureItem[])
    : defaultFeatures;

  const bg = (rawProps.backgroundColor as string) || '#F8FAFC';
  const padding = (rawProps.padding as string) || '28px 24px';

  const featureCards = features.map((f) => {
    const icon = f.icon || '✦';
    const title = interpolateVariables(f.title || '', options);
    const desc = interpolateVariables(f.description || '', options);

    return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;">
      <tr>
        <td width="48" align="center" valign="middle" style="padding: 12px 0 12px 14px; font-size: 20px;">
          ${escapeHtml(icon)}
        </td>
        <td style="padding: 12px 16px 12px 8px; font-family: ${ctx.fontFamily};">
          <div style="font-size: 14px; font-weight: 700; color: #1E293B; margin-bottom: 2px;">
            ${escapeHtml(title)}
          </div>
          <div style="font-size: 13px; color: #64748B; line-height: 1.4;">
            ${escapeHtml(desc)}
          </div>
        </td>
      </tr>
    </table>`;
  });

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${escapeHtml(
    bg
  )};">
    <tr>
      <td style="padding: ${padding}; font-family: ${ctx.fontFamily};">
        ${
          sectionTitle
            ? `<div style="font-size: 18px; font-weight: 800; color: #0F172A; text-align: center; margin-bottom: 20px; letter-spacing: -0.3px;">
                ${escapeHtml(sectionTitle)}
              </div>`
            : ''
        }
        ${featureCards.join('\n')}
      </td>
    </tr>
  </table>`;

  const textLines = [
    sectionTitle,
    ...features.map((f) => `• ${f.title}: ${f.description}`),
  ];
  return { html, text: textLines.join('\n') };
}


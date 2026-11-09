import { BlockContext, BlockRenderResult } from '../types/template.types.js';

export function renderDividerBlock(
  rawProps: Record<string, unknown>,
  _ctx: BlockContext
): BlockRenderResult {
  const color = (rawProps.color as string) || (rawProps.borderColor as string) || '#E2E8F0';
  const thickness = Number(rawProps.thickness) || 1;
  const padding = (rawProps.padding as string) || '16px 32px';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: ${padding};">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-top: ${thickness}px solid ${color}; font-size: 1px; line-height: 1px; height: 1px;">
              &nbsp;
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return { html, text: '----------------------------------------' };
}


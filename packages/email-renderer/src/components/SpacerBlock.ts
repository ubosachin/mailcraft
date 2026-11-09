import { escapeHtml } from '../utils/escape.js';
import { BlockContext, BlockRenderResult } from '../types/template.types.js';

export function renderSpacerBlock(
  rawProps: Record<string, unknown>,
  ctx: BlockContext
): BlockRenderResult {
  const height = Math.max(8, Math.min(160, Number(rawProps.height) || 24));
  const bg = (rawProps.backgroundColor as string) || 'transparent';

  const html = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${escapeHtml(
    bg
  )};">
    <tr>
      <td height="${height}" style="height: ${height}px; font-size: 0; line-height: 0; mso-line-height-rule: exactly;">
        &nbsp;
      </td>
    </tr>
  </table>`;

  return { html, text: '\n' };
}


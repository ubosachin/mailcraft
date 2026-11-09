import { NextRequest } from 'next/server';
import { IEditorSchema } from '@mailcraft/shared-types';
import { compileEmail, getTemplateBySlug } from '@mailcraft/email-renderer';
import { renderTemplateRequestSchema } from '@mailcraft/validation';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = renderTemplateRequestSchema.parse(body);

    let schema: IEditorSchema | undefined = validated.schema as unknown as IEditorSchema | undefined;

    // Resolve by templateId if schema not passed directly
    if (!schema && validated.templateId) {
      const tpl = getTemplateBySlug(validated.templateId);
      if (tpl) {
        schema = tpl.editorSchema;
      }
    }

    if (!schema) {
      return jsonError('Either a structured editor schema or a valid templateId must be provided', 400);
    }

    const rendered = compileEmail({
      schema,
      brand: validated.brand,
      recipient: validated.recipient,
      campaign: validated.campaign,
    });

    return jsonSuccess({
      html: rendered.html,
      text: rendered.text,
      subject: rendered.subject,
      preheader: rendered.preheader,
      htmlByteSize: Buffer.byteLength(rendered.html, 'utf8'),
      textByteSize: Buffer.byteLength(rendered.text, 'utf8'),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

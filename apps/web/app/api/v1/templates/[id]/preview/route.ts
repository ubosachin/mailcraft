import { NextRequest } from 'next/server';
import { connectToDatabase, Template, Brand } from '@mailcraft/database';
import { compileEmail } from '@mailcraft/email-renderer';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const template =
      (await Template.findById(id)) || (await Template.findOne({ slug: id }));

    if (!template) {
      return jsonError('Template not found', 404);
    }

    const session = await resolveGuestSession(request);
    let brand = null;
    if (session) {
      brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    }

    let customSchema = template.editorSchema;
    try {
      const body = await request.json();
      if (body.editorSchema) {
        customSchema = body.editorSchema;
      }
    } catch {
      // Body is optional
    }

    const rendered = compileEmail({
      schema: customSchema,
      brand: brand
        ? {
            brandName: brand.brandName,
            logoUrl: brand.logoUrl,
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            footerAddress: brand.footerAddress,
          }
        : undefined,
      recipient: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/preview_token',
      },
    });

    return jsonSuccess({
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


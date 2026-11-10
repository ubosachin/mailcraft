import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, Brand } from '@mailcraft/database';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const brand = await Brand.findById(campaign.brandId);

    const schema = (campaign.editorData as unknown as IEditorSchema) || {
      settings: { background: '#FFFFFF', contentWidth: 600, fontFamily: 'sans-serif' },
      blocks: [],
    };

    const rendered = compileEmail({
      schema,
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
        unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/sample_token',
      },
    });

    campaign.renderedHtml = rendered.html;
    await campaign.save();

    return jsonSuccess({
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


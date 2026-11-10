import { NextRequest } from 'next/server';
import { Brand } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });

    if (!brand) {
      return jsonSuccess(null, 200, 'No brand configured yet');
    }

    return jsonSuccess({
      id: brand._id.toString(),
      brandName: brand.brandName,
      senderName: brand.senderName,
      senderEmail: brand.senderEmail,
      website: brand.website,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      footerAddress: brand.footerAddress,
      socialLinks: brand.socialLinks,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


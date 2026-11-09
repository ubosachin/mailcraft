import { NextRequest } from 'next/server';
import { Brand } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);

    if (!session) {
      return jsonError('No active guest session found', 401);
    }

    const brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });

    return jsonSuccess({
      session: {
        id: session._id.toString(),
        status: session.status,
        verifiedEmail: session.verifiedEmail,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
      brand: brand
        ? {
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
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

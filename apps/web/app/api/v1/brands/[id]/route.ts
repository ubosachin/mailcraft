import { NextRequest } from 'next/server';
import { updateBrandSchema } from '@mailcraft/validation';
import { Brand } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const brand = await Brand.findOne({ _id: id, sessionId: session._id });

    if (!brand) {
      return jsonError('Brand not found or access denied', 404);
    }

    const body = await request.json();
    const validated = updateBrandSchema.parse(body);

    Object.assign(brand, validated);
    await brand.save();

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


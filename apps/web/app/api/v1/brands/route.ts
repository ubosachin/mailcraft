import { NextRequest } from 'next/server';
import { brandSchema } from '@mailcraft/validation';
import { Brand } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = brandSchema.parse(body);

    // Upsert brand for this session
    let brand = await Brand.findOne({ sessionId: session._id });
    if (brand) {
      Object.assign(brand, validated);
      await brand.save();
    } else {
      brand = await Brand.create({
        sessionId: session._id,
        ...validated,
      });
    }

    return jsonSuccess(
      {
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
      },
      200,
      'Brand profile saved successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const brands = await Brand.find({ sessionId: session._id }).sort({ createdAt: -1 });

    return jsonSuccess(
      brands.map((b) => ({
        id: b._id.toString(),
        brandName: b.brandName,
        senderName: b.senderName,
        senderEmail: b.senderEmail,
        website: b.website,
        logoUrl: b.logoUrl,
        primaryColor: b.primaryColor,
        secondaryColor: b.secondaryColor,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}


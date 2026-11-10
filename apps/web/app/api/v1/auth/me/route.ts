import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  Brand,
  Campaign,
  Contact,
} from '@mailcraft/database';
import { resolveUser } from '@/lib/session';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

function jsonNoStore(data: unknown) {
  return NextResponse.json(
    { success: true, data },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        Vary: 'Cookie',
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const authContext = await resolveUser(request);
    if (!authContext) {
      return jsonNoStore({
        authenticated: false,
        user: null,
        session: null,
        brand: null,
        stats: { campaignCount: 0, contactCount: 0 },
      });
    }

    const { session, user } = authContext;

    // Fetch workspace metadata
    const [brand, campaignCount, contactCount] = await Promise.all([
      Brand.findOne({ sessionId: session._id }),
      Campaign.countDocuments({ sessionId: session._id }),
      Contact.countDocuments({ sessionId: session._id }),
    ]);

    return jsonNoStore({
      authenticated: !!user,
      user: user
        ? {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
            avatarUrl: user.avatarUrl,
            authProvider: user.authProvider,
            createdAt: user.createdAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString(),
          }
        : null,
      session: {
        id: session._id.toString(),
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
        verifiedEmail: session.verifiedEmail,
      },
      brand: brand
        ? {
            id: brand._id.toString(),
            brandName: brand.brandName,
            senderEmail: brand.senderEmail,
            senderName: brand.senderName,
            primaryColor: brand.primaryColor,
          }
        : null,
      stats: {
        campaignCount,
        contactCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


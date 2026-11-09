import { NextRequest } from 'next/server';
import { startGuestSessionSchema } from '@mailcraft/validation';
import { Brand } from '@mailcraft/database';
import { createGuestSession, setSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const validated = startGuestSessionSchema.parse(body);

    const { session, token } = await createGuestSession(
      request,
      validated.senderEmail
    );

    // If initial brand details provided, create default brand
    let brandDoc = null;
    if (validated.brandName || validated.senderEmail) {
      brandDoc = await Brand.create({
        sessionId: session._id,
        brandName: validated.brandName || 'My Brand',
        senderName: validated.brandName || 'Marketing Team',
        senderEmail: validated.senderEmail || 'hello@example.com',
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
      });
    }

    const response = jsonSuccess(
      {
        session: {
          id: session._id.toString(),
          status: session.status,
          verifiedEmail: session.verifiedEmail,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
        brand: brandDoc
          ? {
              id: brandDoc._id.toString(),
              brandName: brandDoc.brandName,
              senderName: brandDoc.senderName,
              senderEmail: brandDoc.senderEmail,
              primaryColor: brandDoc.primaryColor,
              secondaryColor: brandDoc.secondaryColor,
            }
          : null,
        token, // returned for clients that use Bearer auth (e.g. CLI or mobile)
      },
      201,
      'Guest workspace session initialized'
    );

    setSessionCookie(response, token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}


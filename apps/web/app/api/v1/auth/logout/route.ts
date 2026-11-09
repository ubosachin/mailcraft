import { NextRequest } from 'next/server';
import { connectToDatabase } from '@mailcraft/database';
import { resolveGuestSession, clearSessionCookie } from '@/lib/session';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await resolveGuestSession(request);
    if (session) {
      session.status = 'revoked';
      await session.save();
    }

    const response = jsonSuccess({ loggedOut: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}


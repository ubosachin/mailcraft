import { NextRequest } from 'next/server';
import { connectToDatabase } from '@mailcraft/database';
import {
  resolveAuthSession,
  extractSessionToken,
  revokeSessionToken,
  clearSessionCookie,
} from '@/lib/session';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await resolveAuthSession(request);
    const rawToken = extractSessionToken(request);

    if (session) {
      await revokeSessionToken(session, rawToken);
    }

    const response = jsonSuccess({ loggedOut: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

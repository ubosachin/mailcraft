import { NextRequest } from 'next/server';
import { resolveGuestSession, clearSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function DELETE(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (session) {
      session.status = 'revoked';
      await session.save();
    }

    const response = jsonSuccess(
      { revoked: true },
      200,
      'Guest session ended successfully'
    );
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

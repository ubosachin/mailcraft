import { NextRequest } from 'next/server';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session not found or expired', 401);
    }

    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    session.expiresAt = newExpiry;
    session.lastActivityAt = new Date();
    await session.save();

    return jsonSuccess({
      expiresAt: newExpiry.toISOString(),
      message: 'Guest session refreshed successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

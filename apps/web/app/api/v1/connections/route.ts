import { NextRequest } from 'next/server';
import { connectToDatabase, EmailConnection } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    await connectToDatabase();
    const connections = await EmailConnection.find({
      sessionId: session._id,
      status: { $ne: 'disconnected' },
    }).sort({ updatedAt: -1 });

    return jsonSuccess(
      connections.map((c) => ({
        id: c._id.toString(),
        provider: c.provider,
        senderEmail: c.senderEmail,
        senderName: c.senderName,
        status: c.status,
        senderVerificationStatus: c.senderVerificationStatus,
        providerAccountStatus: c.providerAccountStatus,
        lastVerifiedAt: c.lastVerifiedAt?.toISOString(),
        lastError: c.lastError,
        verifiedAt: c.verifiedAt?.toISOString(),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

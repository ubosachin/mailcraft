import { NextRequest } from 'next/server';
import { connectToDatabase, EmailConnection } from '@mailcraft/database';
import { createProviderFromConnection } from '@mailcraft/email-providers';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const connection = await EmailConnection.findOne({
      _id: id,
      sessionId: session._id,
      status: { $ne: 'disconnected' },
    });

    if (!connection) {
      return jsonError('Connection not found or access denied', 404);
    }

    const provider = createProviderFromConnection(connection, { allowPending: true });
    const senderDetails = await provider.verifySender(connection.senderEmail);

    if (senderDetails.verified) {
      connection.senderVerificationStatus = 'verified';
      connection.status = 'connected';
      connection.verifiedAt = new Date();
      connection.lastError = undefined;
    } else {
      connection.senderVerificationStatus = 'pending';
      connection.status = 'verification_required';
    }

    connection.lastVerifiedAt = new Date();
    await connection.save();

    return jsonSuccess(
      {
        connectionId: connection._id.toString(),
        provider: connection.provider,
        senderEmail: connection.senderEmail,
        status: connection.status,
        senderVerificationStatus: connection.senderVerificationStatus,
        details: senderDetails,
      },
      200,
      senderDetails.verified
        ? 'Sender identity is verified'
        : 'Sender requires DNS verification'
    );
  } catch (error) {
    return handleApiError(error);
  }
}


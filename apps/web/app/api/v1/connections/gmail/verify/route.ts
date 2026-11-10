import { NextRequest } from 'next/server';
import {
  connectToDatabase,
  EmailConnection,
  decryptCredentials,
} from '@mailcraft/database';
import { GmailProvider } from '@mailcraft/email-providers';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();

    const connection = await EmailConnection.findOne({
      sessionId: session._id,
      provider: 'gmail',
      status: { $ne: 'disconnected' },
    });

    if (!connection) {
      return jsonError('No Gmail connection found for this session', 404);
    }

    const creds = decryptCredentials<{ refreshToken?: string }>(connection.encryptedCredentials);
    const gmail = new GmailProvider({
      refreshToken: creds.refreshToken || '',
      senderEmail: connection.senderEmail,
      senderName: connection.senderName,
    });

    const verification = await gmail.verifyConnection();

    if (verification.valid) {
      connection.status = 'connected';
      connection.lastVerifiedAt = new Date();
      connection.lastError = undefined;
      await connection.save();
    } else {
      connection.status = 'auth_failed';
      connection.lastError = verification.error;
      await connection.save();
    }

    return jsonSuccess({
      provider: 'gmail',
      verified: verification.valid,
      accountStatus: verification.accountStatus,
      senderEmail: connection.senderEmail,
      error: verification.error,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

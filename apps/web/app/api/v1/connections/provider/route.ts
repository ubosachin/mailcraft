import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
} from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const connectProviderSchema = z.object({
  provider: z.enum(['gmail', 'brevo', 'ses']),
  senderEmail: z.string().trim().email(),
  credentials: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    const validated = connectProviderSchema.parse(body);

    await connectToDatabase();

    const encryptedCredentials = encryptCredentials(validated.credentials);

    const connection = await EmailConnection.findOneAndUpdate(
      { sessionId: session._id, provider: validated.provider },
      {
        $set: {
          senderEmail: validated.senderEmail.toLowerCase().trim(),
          encryptedCredentials,
          credentialVersion: 1,
          status: 'connected',
          verifiedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return jsonSuccess(
      {
        id: connection._id.toString(),
        provider: connection.provider,
        senderEmail: connection.senderEmail,
        status: connection.status,
        verifiedAt: connection.verifiedAt?.toISOString(),
      },
      200,
      `Connected ${validated.provider.toUpperCase()} sending account securely`
    );
  } catch (error) {
    return handleApiError(error);
  }
}


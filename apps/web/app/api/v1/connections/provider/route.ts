import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
} from '@mailcraft/database';
import { BrevoProvider, SesProvider } from '@mailcraft/email-providers';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const connectProviderSchema = z.object({
  provider: z.enum(['brevo', 'ses']),
  senderEmail: z.string().trim().email(),
  senderName: z.string().trim().optional(),
  credentials: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = connectProviderSchema.parse(body);
    const senderEmail = validated.senderEmail.toLowerCase().trim();
    const senderName = validated.senderName?.trim();

    await connectToDatabase();

    // Verify credentials immediately against provider API
    let initialVerification;
    let initialSenderVerification;

    if (validated.provider === 'brevo') {
      const apiKey = (validated.credentials.apiKey as string) || '';
      if (!apiKey) {
        return jsonError('Brevo API key is required', 400);
      }
      const brevo = new BrevoProvider({
        apiKey,
        defaultSenderEmail: senderEmail,
        defaultSenderName: senderName,
      });

      initialVerification = await brevo.verifyConnection();
      if (!initialVerification.valid) {
        return jsonError(
          initialVerification.error || 'Failed to authenticate with Brevo API',
          400
        );
      }

      initialSenderVerification = await brevo.verifySender(senderEmail);
    } else if (validated.provider === 'ses') {
      const accessKeyId = (validated.credentials.accessKeyId as string) || '';
      const secretAccessKey = (validated.credentials.secretAccessKey as string) || '';
      const region = (validated.credentials.region as string) || 'us-east-1';

      if (!accessKeyId || !secretAccessKey) {
        return jsonError('AWS Access Key ID and Secret Access Key are required', 400);
      }

      const ses = new SesProvider({
        accessKeyId,
        secretAccessKey,
        region,
        defaultSenderEmail: senderEmail,
        defaultSenderName: senderName,
      });

      initialVerification = await ses.verifyConnection();
      if (!initialVerification.valid) {
        return jsonError(
          initialVerification.error || 'Failed to authenticate with Amazon SES',
          400
        );
      }

      initialSenderVerification = await ses.verifySender(senderEmail);
    }

    const encryptedCredentials = encryptCredentials(validated.credentials);

    const isSenderVerified = initialSenderVerification?.verified ?? false;
    const connectionStatus = isSenderVerified ? 'connected' : 'verification_required';
    const senderVerificationStatus = isSenderVerified ? 'verified' : 'pending';

    const connection = await EmailConnection.findOneAndUpdate(
      { sessionId: session._id, provider: validated.provider },
      {
        $set: {
          senderEmail,
          senderName,
          encryptedCredentials,
          credentialVersion: 1,
          status: connectionStatus,
          senderVerificationStatus,
          providerAccountStatus: initialVerification?.accountStatus || 'active',
          lastVerifiedAt: new Date(),
          verifiedAt: isSenderVerified ? new Date() : null,
          lastError: null,
        },
      },
      { upsert: true, new: true }
    );

    return jsonSuccess(
      {
        id: connection._id.toString(),
        provider: connection.provider,
        senderEmail: connection.senderEmail,
        senderName: connection.senderName,
        status: connection.status,
        senderVerificationStatus: connection.senderVerificationStatus,
        providerAccountStatus: connection.providerAccountStatus,
        lastVerifiedAt: connection.lastVerifiedAt?.toISOString(),
        verifiedAt: connection.verifiedAt?.toISOString(),
        verificationDetails: initialSenderVerification,
      },
      200,
      `Connected ${validated.provider.toUpperCase()} sending account securely`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

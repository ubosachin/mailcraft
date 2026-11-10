import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GMAIL_SMTP_DAILY_LIMIT } from '@mailcraft/shared-types';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
  getConnectionDailyQuotaStatus,
} from '@mailcraft/database';
import {
  BrevoProvider,
  SesProvider,
  GmailSmtpProvider,
  normalizeGoogleAppPassword,
} from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const connectProviderSchema = z.object({
  provider: z.enum(['brevo', 'ses', 'gmail_smtp']),
  senderEmail: z.string().trim().email(),
  senderName: z.string().trim().optional(),
  credentials: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = connectProviderSchema.parse(body);
    const senderEmail = validated.senderEmail.toLowerCase().trim();
    const senderName = validated.senderName?.trim();

    await connectToDatabase();

    let initialVerification;
    let initialSenderVerification;
    let credentialsToEncrypt: Record<string, unknown> = validated.credentials;
    let dailyQuotaLimit: number | null = null;

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
    } else if (validated.provider === 'gmail_smtp') {
      const rawAppPassword = String(validated.credentials.appPassword || '');
      const normalizedPassword = normalizeGoogleAppPassword(rawAppPassword);
      if (!normalizedPassword || normalizedPassword.length < 16) {
        return jsonError(
          'A valid 16-character Google App Password is required (enable 2-Step Verification in your Google Account to generate one).',
          400
        );
      }

      const gmailSmtp = new GmailSmtpProvider({
        gmailAddress: senderEmail,
        appPassword: normalizedPassword,
        senderName,
      });

      initialVerification = await gmailSmtp.verifyConnection();
      await gmailSmtp.disconnect();

      if (!initialVerification.valid) {
        return jsonError(
          initialVerification.error || 'Failed to authenticate Gmail SMTP credentials',
          400
        );
      }

      initialSenderVerification = await gmailSmtp.verifySender(senderEmail);
      credentialsToEncrypt = { appPassword: normalizedPassword };
      dailyQuotaLimit = GMAIL_SMTP_DAILY_LIMIT;
    }

    const encryptedCredentials = encryptCredentials(credentialsToEncrypt);

    const isSenderVerified = initialSenderVerification?.verified ?? false;
    const connectionStatus = isSenderVerified ? 'connected' : 'verification_required';
    const senderVerificationStatus = isSenderVerified ? 'verified' : 'pending';

    const updateSet: Record<string, unknown> = {
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
    };

    if (dailyQuotaLimit !== null) {
      updateSet.dailyQuotaLimit = dailyQuotaLimit;
    }

    const connection = await EmailConnection.findOneAndUpdate(
      { sessionId: session._id, provider: validated.provider },
      { $set: updateSet },
      { upsert: true, new: true }
    );

    const quota = getConnectionDailyQuotaStatus(connection);

    return jsonSuccess(
      {
        id: connection._id.toString(),
        provider: connection.provider,
        senderEmail: connection.senderEmail,
        senderName: connection.senderName,
        status: connection.status,
        senderVerificationStatus: connection.senderVerificationStatus,
        providerAccountStatus: connection.providerAccountStatus,
        dailyQuotaLimit: quota.limit,
        dailySentCount: quota.sentToday,
        dailyRemaining: quota.remaining,
        lastVerifiedAt: connection.lastVerifiedAt?.toISOString(),
        verifiedAt: connection.verifiedAt?.toISOString(),
        senderVerification: initialSenderVerification,
      },
      200,
      isSenderVerified
        ? `${validated.provider === 'gmail_smtp' ? 'Gmail App Password (1,500/day limit)' : validated.provider.toUpperCase()} connected and verified!`
        : `${validated.provider.toUpperCase()} authenticated. Sender domain DNS setup is pending.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

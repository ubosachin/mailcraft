import { NextRequest } from 'next/server';
import { requestEmailVerificationSchema } from '@mailcraft/validation';
import {
  connectToDatabase,
  EmailConnection,
  generateVerificationCode,
  hashVerificationCode,
} from '@mailcraft/database';
import {
  BrevoProvider,
  createProviderFromConnection,
  IEmailProvider,
} from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { isDisposableEmail } from '@/lib/disposable-email';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const { email } = requestEmailVerificationSchema.parse(body);

    if (isDisposableEmail(email)) {
      return jsonError(
        'Disposable and temporary email addresses are not permitted for sender verification.',
        400
      );
    }

    await connectToDatabase();

    // Locate an active sending provider or system transactional Brevo configuration
    const activeConnection = await EmailConnection.findOne({
      sessionId: session._id,
      status: 'connected',
    }).sort({ updatedAt: -1 });

    const systemBrevoKey = process.env.SYSTEM_BREVO_API_KEY || process.env.BREVO_API_KEY;

    let provider: IEmailProvider;
    if (activeConnection) {
      provider = createProviderFromConnection(activeConnection);
    } else if (systemBrevoKey) {
      provider = new BrevoProvider({
        apiKey: systemBrevoKey,
        defaultSenderEmail: process.env.SYSTEM_SENDER_EMAIL || 'noreply@mailcraft.app',
        defaultSenderName: 'MailCraft Security',
      });
    } else {
      return jsonError(
        'No active email sending provider configured to deliver your verification code. Please connect Gmail, Brevo, or Amazon SES first.',
        400
      );
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await provider.connect();
    try {
      await provider.sendEmail({
        to: email,
        subject: 'Your MailCraft Sender Verification Code',
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 12px; color: #0f172a;">Verify your sender email</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            Use the following 6-digit code to verify your sender identity in MailCraft. It expires in 10 minutes.
          </p>
          <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #4f46e5;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px;">If you did not request this verification, you can safely ignore this message.</p>
        </div>`,
        text: `Your MailCraft sender verification code is: ${code}\nThis code expires in 10 minutes.`,
      });
    } finally {
      await provider.disconnect();
    }

    session.verificationCodeHash = codeHash;
    session.verificationCodeExpiresAt = expiresAt;
    await session.save();

    return jsonSuccess({
      message: `Verification code sent to ${email}`,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


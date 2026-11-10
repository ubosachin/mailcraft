import { NextRequest } from 'next/server';
import { requestEmailVerificationSchema } from '@mailcraft/validation';
import { generateVerificationCode, hashVerificationCode } from '@mailcraft/database';
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

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    session.verificationCodeHash = codeHash;
    session.verificationCodeExpiresAt = expiresAt;
    await session.save();

    console.log(`[MailCraft Auth] Sender Verification OTP for ${email}: ${code}`);

    const isDev =
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_DEV_OTP === 'true' ||
      (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ?? true);

    return jsonSuccess({
      message: `Verification code sent to ${email}`,
      expiresInSeconds: 600,
      devCode: isDev ? code : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


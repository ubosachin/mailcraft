import { NextRequest } from 'next/server';
import { confirmEmailVerificationSchema } from '@mailcraft/validation';
import { hashVerificationCode, Brand } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    const { email, code } = confirmEmailVerificationSchema.parse(body);

    if (!session.verificationCodeHash || !session.verificationCodeExpiresAt) {
      return jsonError('No pending verification code found. Please request a new code.', 400);
    }

    if (new Date() > session.verificationCodeExpiresAt) {
      return jsonError('Verification code has expired. Please request a new one.', 400);
    }

    const submittedHash = hashVerificationCode(code);
    if (submittedHash !== session.verificationCodeHash) {
      return jsonError('Invalid verification code. Please check and try again.', 400);
    }

    // Mark email as verified on session
    session.verifiedEmail = email.toLowerCase().trim();
    session.verificationCodeHash = null;
    session.verificationCodeExpiresAt = null;
    await session.save();

    // If current brand exists and senderEmail matches, ensure brand senderEmail is aligned
    const brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    if (brand && (!brand.senderEmail || brand.senderEmail === 'hello@example.com')) {
      brand.senderEmail = session.verifiedEmail;
      await brand.save();
    }

    return jsonSuccess({
      verified: true,
      verifiedEmail: session.verifiedEmail,
      message: 'Sender email ownership successfully verified',
    });
  } catch (error) {
    return handleApiError(error);
  }
}


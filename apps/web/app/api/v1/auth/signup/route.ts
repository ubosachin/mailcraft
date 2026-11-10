import { NextRequest } from 'next/server';
import { signupSchema } from '@mailcraft/validation';
import {
  connectToDatabase,
  User,
  Brand,
  hashPassword,
} from '@mailcraft/database';
import {
  createAuthenticatedSession,
  setSessionCookie,
} from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limiter';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = await checkRateLimit(`auth_signup:${ip}`, 'SESSION_CREATE');
    if (!rateLimit.success) {
      return jsonError('Too many signup requests. Please try again later.', 429, {
        retryAfter: Math.ceil(rateLimit.resetMs / 1000),
      });
    }

    await connectToDatabase();

    const body = await request.json();
    const validated = signupSchema.parse(body);

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return jsonError('An account with this email address already exists.', 409);
    }

    // 2. Hash password securely using scrypt + salt
    const { hash, salt } = await hashPassword(validated.password);

    // 3. Create User record
    const user = await User.create({
      email: validated.email,
      passwordHash: hash,
      passwordSalt: salt,
      name: validated.name || validated.email.split('@')[0],
      role: 'user',
      emailVerified: false,
      authProvider: 'local',
      lastLoginAt: new Date(),
    });

    // 4. Create authenticated workspace session
    const { session, token } = await createAuthenticatedSession(request, user);

    // 5. Initialize default brand if brandName provided
    let brandDoc = null;
    if (validated.brandName) {
      brandDoc = await Brand.create({
        sessionId: session._id,
        brandName: validated.brandName,
        senderName: user.name || validated.brandName,
        senderEmail: user.email,
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
      });
    }

    const response = jsonSuccess(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          authProvider: user.authProvider,
          createdAt: user.createdAt.toISOString(),
        },
        session: {
          id: session._id.toString(),
          expiresAt: session.expiresAt.toISOString(),
        },
        brand: brandDoc
          ? {
              id: brandDoc._id.toString(),
              brandName: brandDoc.brandName,
              senderEmail: brandDoc.senderEmail,
            }
          : null,
      },
      201
    );

    setSessionCookie(response, token, session.expiresAt, request);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

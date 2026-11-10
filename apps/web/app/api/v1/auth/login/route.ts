import { NextRequest } from 'next/server';
import { loginSchema } from '@mailcraft/validation';
import {
  connectToDatabase,
  User,
  verifyPassword,
} from '@mailcraft/database';
import {
  createAuthenticatedSession,
  setSessionCookie,
} from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validated = loginSchema.parse(body);

    // 1. Find user by email
    const user = await User.findOne({ email: validated.email });
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return jsonError('Invalid email or password.', 401);
    }

    // 2. Verify password
    const isMatch = await verifyPassword(
      validated.password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!isMatch) {
      return jsonError('Invalid email or password.', 401);
    }

    // 3. Create or restore user's persistent workspace session
    const { session, token } = await createAuthenticatedSession(request, user);

    const response = jsonSuccess({
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
    });

    setSessionCookie(response, token, session.expiresAt, request);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

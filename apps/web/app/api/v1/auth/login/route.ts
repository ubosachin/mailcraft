import { NextRequest } from 'next/server';
import { loginSchema } from '@mailcraft/validation';
import {
  connectToDatabase,
  User,
  verifyPassword,
} from '@mailcraft/database';
import {
  resolveGuestSession,
  upgradeSessionToUser,
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

    // 3. Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // 4. Session management
    const existingSession = await resolveGuestSession(request);
    let sessionDoc;
    let sessionToken: string | null = null;
    let isGuestUpgraded = false;

    if (existingSession && !existingSession.userId) {
      // Upgrade existing guest session to this user so current work is claimed
      sessionDoc = await upgradeSessionToUser(existingSession, user);
      isGuestUpgraded = true;
    } else {
      // Generate a new authenticated session
      const created = await createAuthenticatedSession(request, user);
      sessionDoc = created.session;
      sessionToken = created.token;
    }

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
        id: sessionDoc._id.toString(),
        expiresAt: sessionDoc.expiresAt.toISOString(),
        isGuestUpgraded,
      },
    });

    if (sessionToken) {
      setSessionCookie(response, sessionToken, sessionDoc.expiresAt);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}


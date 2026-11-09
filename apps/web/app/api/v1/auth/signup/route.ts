import { NextRequest } from 'next/server';
import { signupSchema } from '@mailcraft/validation';
import {
  connectToDatabase,
  User,
  Brand,
  hashPassword,
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

    // 4. Check if client has an active guest session to upgrade
    const existingSession = await resolveGuestSession(request);
    let sessionDoc;
    let sessionToken: string | null = null;
    let isGuestUpgraded = false;

    if (existingSession && !existingSession.userId) {
      // Upgrade existing guest session to this user
      sessionDoc = await upgradeSessionToUser(existingSession, user);
      isGuestUpgraded = true;

      // Ensure existing brand has the verified email
      const existingBrand = await Brand.findOne({ sessionId: sessionDoc._id });
      if (existingBrand && !existingBrand.senderEmail) {
        existingBrand.senderEmail = user.email;
        await existingBrand.save();
      }
    } else {
      // Create fresh authenticated session
      const created = await createAuthenticatedSession(request, user);
      sessionDoc = created.session;
      sessionToken = created.token;
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
          id: sessionDoc._id.toString(),
          expiresAt: sessionDoc.expiresAt.toISOString(),
          isGuestUpgraded,
        },
      },
      201
    );

    // Set cookie if a new session was generated
    if (sessionToken) {
      setSessionCookie(response, sessionToken, sessionDoc.expiresAt);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}


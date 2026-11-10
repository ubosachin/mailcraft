import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  connectToDatabase,
  UserSession,
  User,
  hashSessionToken,
} from '@mailcraft/database';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * Validates the `mailcraft_session` cookie against MongoDB in a Server Component
 * before streaming any protected route HTML or RSC payload.
 * Missing, expired, revoked, or orphaned sessions trigger an immediate 307 redirect to `/login`.
 */
export async function requireServerAuth(redirectPath: string): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();

  let isAuthorized = false;

  if (rawToken) {
    try {
      await connectToDatabase();
      const tokenHash = hashSessionToken(rawToken);
      const session = await UserSession.findOne({
        userId: { $ne: null },
        status: 'active',
        expiresAt: { $gt: new Date() },
        $or: [{ sessionTokenHash: tokenHash }, { tokenHashes: tokenHash }],
      })
        .select('_id userId')
        .lean<{ _id: unknown; userId: unknown } | null>();

      if (session?.userId) {
        const userExists = await User.exists({ _id: session.userId });
        isAuthorized = Boolean(userExists);
      }
    } catch (error) {
      // Fail closed so a transient DB error never streams protected workspace UI unauthenticated.
      console.error('[server-auth] Session verification failed:', error);
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
}


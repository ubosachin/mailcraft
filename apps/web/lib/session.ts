import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  UserSession,
  User,
  generateSessionToken,
  hashSessionToken,
  IUserSessionDoc,
  IUserDoc,
} from '@mailcraft/database';

export const SESSION_COOKIE_NAME = 'mailcraft_session';
const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function extractSessionToken(request: NextRequest): string | null {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    return cookie.value;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Resolves an authenticated user workspace session.
 */
export async function resolveAuthSession(
  request: NextRequest
): Promise<IUserSessionDoc | null> {
  await connectToDatabase();

  const rawToken = extractSessionToken(request);
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  const session = await UserSession.findOne({
    userId: { $ne: null },
    status: 'active',
    expiresAt: { $gt: now },
    $or: [{ sessionTokenHash: tokenHash }, { tokenHashes: tokenHash }],
  });

  if (session) {
    session.lastActivityAt = now;
    session.expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
    await session.save();
  }

  return session;
}

export async function resolveUser(
  request: NextRequest
): Promise<{ session: IUserSessionDoc; user: IUserDoc } | null> {
  const session = await resolveAuthSession(request);
  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user) {
    return null;
  }

  return { session, user };
}

/**
 * Creates or restores the persistent workspace session for an authenticated user.
 */
export async function createAuthenticatedSession(
  request: NextRequest | undefined,
  user: IUserDoc
): Promise<{ session: IUserSessionDoc; token: string }> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
  const userAgent = request?.headers.get('user-agent') || undefined;

  if (user.primarySessionId) {
    const existingSession = await UserSession.findById(user.primarySessionId);
    if (existingSession) {
      const existingHashes = (existingSession.tokenHashes || []).slice(-9);
      existingHashes.push(tokenHash);

      existingSession.tokenHashes = existingHashes;
      if (existingSession.sessionTokenHash.startsWith('revoked_')) {
        existingSession.sessionTokenHash = tokenHash;
      }
      existingSession.status = 'active';
      existingSession.expiresAt = expiresAt;
      existingSession.lastActivityAt = now;
      if (userAgent) existingSession.userAgent = userAgent;
      await existingSession.save();

      user.lastLoginAt = now;
      await user.save();

      return { session: existingSession, token };
    }
  }

  const session = await UserSession.create({
    sessionTokenHash: tokenHash,
    tokenHashes: [tokenHash],
    userId: user._id,
    status: 'active',
    verifiedEmail: user.email,
    userAgent,
    createdAt: now,
    expiresAt,
    lastActivityAt: now,
  });

  user.primarySessionId = session._id;
  user.lastLoginAt = now;
  await user.save();

  return { session, token };
}

export async function revokeSessionToken(
  session: IUserSessionDoc,
  rawToken: string | null
): Promise<void> {
  if (!rawToken) {
    session.status = 'revoked';
    await session.save();
    return;
  }

  const tokenHash = hashSessionToken(rawToken);
  const filteredHashes = (session.tokenHashes || []).filter((h) => h !== tokenHash);
  session.tokenHashes = filteredHashes;

  if (session.sessionTokenHash === tokenHash) {
    session.sessionTokenHash = `revoked_${crypto.randomBytes(16).toString('hex')}`;
  }

  if (filteredHashes.length === 0) {
    session.status = 'revoked';
  }

  await session.save();
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

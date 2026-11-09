import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  GuestSession,
  User,
  generateSessionToken,
  hashSessionToken,
  IGuestSessionDoc,
  IUserDoc,
} from '@mailcraft/database';

export const SESSION_COOKIE_NAME = 'mailcraft_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for guest sessions
const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for authenticated users

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

export async function resolveGuestSession(
  request: NextRequest
): Promise<IGuestSessionDoc | null> {
  await connectToDatabase();

  const rawToken = extractSessionToken(request);
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const session = await GuestSession.findOne({
    sessionTokenHash: tokenHash,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });

  if (session) {
    // Touch last activity
    session.lastActivityAt = new Date();
    await session.save();
  }

  return session;
}

export async function createGuestSession(
  request?: NextRequest,
  seedEmail?: string
): Promise<{ session: IGuestSessionDoc; token: string }> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const userAgent = request?.headers.get('user-agent') || undefined;

  const session = await GuestSession.create({
    sessionTokenHash: tokenHash,
    status: 'active',
    verifiedEmail: seedEmail ? seedEmail.toLowerCase().trim() : null,
    userAgent,
    createdAt: now,
    expiresAt,
    lastActivityAt: now,
  });

  return { session, token };
}

export async function resolveUser(
  request: NextRequest
): Promise<{ session: IGuestSessionDoc; user: IUserDoc | null } | null> {
  const session = await resolveGuestSession(request);
  if (!session) {
    return null;
  }

  let user: IUserDoc | null = null;
  if (session.userId) {
    user = await User.findById(session.userId);
  }

  return { session, user };
}

export async function upgradeSessionToUser(
  session: IGuestSessionDoc,
  user: IUserDoc
): Promise<IGuestSessionDoc> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);

  session.userId = user._id;
  session.verifiedEmail = user.email;
  session.expiresAt = expiresAt;
  session.lastActivityAt = now;
  await session.save();

  user.primarySessionId = session._id;
  await user.save();

  return session;
}

export async function createAuthenticatedSession(
  request: NextRequest | undefined,
  user: IUserDoc
): Promise<{ session: IGuestSessionDoc; token: string }> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);

  const userAgent = request?.headers.get('user-agent') || undefined;

  const session = await GuestSession.create({
    sessionTokenHash: tokenHash,
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



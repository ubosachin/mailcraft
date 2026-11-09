import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  User,
  Brand,
  EmailConnection,
  encryptCredentials,
} from '@mailcraft/database';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import {
  resolveGuestSession,
  upgradeSessionToUser,
  createAuthenticatedSession,
  setSessionCookie,
} from '@/lib/session';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(errorParam)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/login?error=missing_oauth_code`);
    }

    const session = await resolveGuestSession(request);
    if (!session) {
      return NextResponse.redirect(`${appUrl}/login?error=session_missing`);
    }

    const rawState = state.replace(/^auth_/, '');
    const client = new GmailOAuthClient();
    const isValidState = client.validateState(rawState, session._id.toString());
    if (!isValidState) {
      return NextResponse.redirect(`${appUrl}/login?error=invalid_oauth_state`);
    }

    // Exchange OAuth code
    const tokens = await client.exchangeCode(code);
    const userInfo = await client.getUserInfo(tokens.accessToken);

    await connectToDatabase();

    const normalizedEmail = userInfo.email.toLowerCase().trim();

    // Find or create User
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        name: userInfo.name || normalizedEmail.split('@')[0],
        avatarUrl: userInfo.picture,
        googleId: normalizedEmail,
        emailVerified: userInfo.verifiedEmail ?? true,
        authProvider: 'google',
        lastLoginAt: new Date(),
      });
    } else {
      user.googleId = normalizedEmail;
      user.lastLoginAt = new Date();
      if (userInfo.picture) user.avatarUrl = userInfo.picture;
      if (!user.name && userInfo.name) user.name = userInfo.name;
      await user.save();
    }

    // Session handling
    let sessionDoc = session;
    let sessionToken: string | null = null;

    if (!session.userId) {
      sessionDoc = await upgradeSessionToUser(session, user);
    } else if (session.userId.toString() !== user._id.toString()) {
      const created = await createAuthenticatedSession(request, user);
      sessionDoc = created.session;
      sessionToken = created.token;
    }

    // Upsert Brand with user's verified sender email
    const existingBrand = await Brand.findOne({ sessionId: sessionDoc._id });
    if (!existingBrand) {
      await Brand.create({
        sessionId: sessionDoc._id,
        brandName: user.name || 'My Brand',
        senderName: user.name || 'Marketing Team',
        senderEmail: user.email,
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
      });
    }

    // Also auto-save Gmail sending connection so user is sending-ready immediately
    if (tokens.refreshToken) {
      const encrypted = encryptCredentials({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: Date.now() + tokens.expiresIn * 1000,
        scope: tokens.scope,
      });

      await EmailConnection.findOneAndUpdate(
        { sessionId: sessionDoc._id, provider: 'gmail' },
        {
          sessionId: sessionDoc._id,
          provider: 'gmail',
          senderEmail: normalizedEmail,
          status: 'connected',
          encryptedCredentials: encrypted,
          verifiedAt: new Date(),
          dailyQuota: 500,
        },
        { upsert: true, new: true }
      );
    }

    const response = NextResponse.redirect(`${appUrl}/workspace?auth=success`);
    if (sessionToken) {
      setSessionCookie(response, sessionToken, sessionDoc.expiresAt);
    }

    return response;
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_exchange_failed`);
  }
}

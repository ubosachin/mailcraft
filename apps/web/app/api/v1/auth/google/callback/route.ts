import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  User,
  Brand,
  EmailConnection,
  encryptCredentials,
  decryptCredentials,
} from '@mailcraft/database';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import {
  createAuthenticatedSession,
  setSessionCookie,
} from '@/lib/session';
import { getAppUrl } from '@/lib/url';
import {
  GOOGLE_AUTH_NONCE_COOKIE,
  GOOGLE_AUTH_PKCE_COOKIE,
  clearOAuthFlowCookies,
} from '@/lib/oauth-cookies';

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);

  const redirectWithError = (errorCode: string) => {
    const res = NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(errorCode)}`);
    clearOAuthFlowCookies(res, request, [GOOGLE_AUTH_NONCE_COOKIE, GOOGLE_AUTH_PKCE_COOKIE]);
    return res;
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return redirectWithError(errorParam);
    }

    if (!code || !state) {
      return redirectWithError('missing_oauth_code');
    }

    const oauthNonce = request.cookies.get(GOOGLE_AUTH_NONCE_COOKIE)?.value;
    if (!oauthNonce) {
      return redirectWithError('invalid_oauth_state');
    }

    const rawState = state.replace(/^auth_/, '');
    const client = new GmailOAuthClient({
      redirectUri: `${appUrl}/api/v1/auth/google/callback`,
    });

    if (!client.isConfigured()) {
      return redirectWithError('google_oauth_not_configured');
    }

    const isValidState = client.validateState(rawState, oauthNonce);
    if (!isValidState) {
      return redirectWithError('invalid_oauth_state');
    }

    // Exchange OAuth code using PKCE verifier when present
    const codeVerifier = request.cookies.get(GOOGLE_AUTH_PKCE_COOKIE)?.value;
    const tokens = await client.exchangeCode(code, codeVerifier);
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

    // Create or restore authenticated workspace session
    const { session: sessionDoc, token: sessionToken } = await createAuthenticatedSession(request, user);

    // Ensure Brand exists for user workspace
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

    // Auto-save Gmail sending connection ONLY when the granted OAuth token includes gmail.send scope
    const hasGmailSendScope = Boolean(tokens.scope?.includes('gmail.send'));
    if (hasGmailSendScope) {
      const existingConnection = await EmailConnection.findOne({
        sessionId: sessionDoc._id,
        provider: 'gmail',
      });

      let finalRefreshToken = tokens.refreshToken;
      if (!finalRefreshToken && existingConnection) {
        try {
          const prev = decryptCredentials<{ refreshToken?: string }>(
            existingConnection.encryptedCredentials
          );
          finalRefreshToken = prev.refreshToken;
        } catch {
          // Ignore decryption failures on stale records
        }
      }

      if (finalRefreshToken) {
        const encrypted = encryptCredentials({
          accessToken: tokens.accessToken,
          refreshToken: finalRefreshToken,
          expiryDate: Date.now() + tokens.expiresIn * 1000,
          scope: tokens.scope,
        });

        await EmailConnection.findOneAndUpdate(
          { sessionId: sessionDoc._id, provider: 'gmail' },
          {
            $set: {
              senderEmail: normalizedEmail,
              senderName: user.name || undefined,
              encryptedCredentials: encrypted,
              credentialVersion: 1,
              status: 'connected',
              senderVerificationStatus: 'verified',
              providerAccountStatus: 'active',
              verifiedAt: new Date(),
              lastVerifiedAt: new Date(),
              lastError: null,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    const response = NextResponse.redirect(`${appUrl}/workspace?auth=success`);
    setSessionCookie(response, sessionToken, sessionDoc.expiresAt, request);
    clearOAuthFlowCookies(response, request, [GOOGLE_AUTH_NONCE_COOKIE, GOOGLE_AUTH_PKCE_COOKIE]);

    return response;
  } catch (error) {
    console.error('[Google OAuth Auth Callback Error]:', error);
    return redirectWithError('oauth_exchange_failed');
  }
}

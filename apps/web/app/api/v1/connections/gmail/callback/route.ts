import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
  decryptCredentials,
} from '@mailcraft/database';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, handleApiError } from '@/lib/api-response';
import { getAppUrl } from '@/lib/url';
import { appendQueryParam, sanitizeRelativeReturnPath } from '@/lib/oauth-helpers';
import {
  GMAIL_CONNECT_PKCE_COOKIE,
  GMAIL_CONNECT_RETURN_COOKIE,
  clearOAuthFlowCookies,
} from '@/lib/oauth-cookies';

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const returnBase = sanitizeRelativeReturnPath(
    request.cookies.get(GMAIL_CONNECT_RETURN_COOKIE)?.value,
    '/connect'
  );
  const wantsJson =
    request.headers.get('accept')?.includes('application/json') ||
    request.nextUrl.searchParams.get('format') === 'json';

  const redirectToReturnBase = (params: Record<string, string>) => {
    let targetPath = returnBase;
    for (const [k, v] of Object.entries(params)) {
      targetPath = appendQueryParam(targetPath, k, v);
    }
    const res = NextResponse.redirect(`${appUrl}${targetPath}`);
    clearOAuthFlowCookies(res, request, [GMAIL_CONNECT_PKCE_COOKIE, GMAIL_CONNECT_RETURN_COOKIE]);
    return res;
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return redirectToReturnBase({ error: errorParam });
    }

    if (!code || !state) {
      return redirectToReturnBase({ error: 'missing_oauth_code' });
    }

    const session = await resolveAuthSession(request);
    if (!session) {
      return redirectToReturnBase({ error: 'authentication_required' });
    }

    const client = new GmailOAuthClient({
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl}/api/v1/connections/gmail/callback`,
    });

    if (!client.isConfigured()) {
      return redirectToReturnBase({ error: 'google_oauth_not_configured' });
    }

    const isValidState = client.validateState(state, session._id.toString());
    if (!isValidState) {
      return redirectToReturnBase({ error: 'invalid_or_expired_oauth_state' });
    }

    // Exchange code for tokens (including PKCE code_verifier)
    const codeVerifier = request.cookies.get(GMAIL_CONNECT_PKCE_COOKIE)?.value;
    const tokens = await client.exchangeCode(code, codeVerifier);
    const userInfo = await client.getUserInfo(tokens.accessToken);

    await connectToDatabase();

    // Check existing connection in case Google didn't return a new refreshToken
    const existing = await EmailConnection.findOne({
      sessionId: session._id,
      provider: 'gmail',
    });

    let finalRefreshToken = tokens.refreshToken;
    if (!finalRefreshToken && existing) {
      try {
        const prev = decryptCredentials<{ refreshToken?: string }>(existing.encryptedCredentials);
        finalRefreshToken = prev.refreshToken;
      } catch {
        // Ignore decryption failure and redirect below if no refresh token exists
      }
    }

    if (!finalRefreshToken) {
      return redirectToReturnBase({ error: 'missing_refresh_token' });
    }

    const encryptedCredentials = encryptCredentials({
      refreshToken: finalRefreshToken,
      accessToken: tokens.accessToken,
      expiryDate: Date.now() + tokens.expiresIn * 1000,
    });

    const connection = await EmailConnection.findOneAndUpdate(
      { sessionId: session._id, provider: 'gmail' },
      {
        $set: {
          senderEmail: userInfo.email.toLowerCase().trim(),
          senderName: userInfo.name,
          encryptedCredentials,
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

    if (wantsJson) {
      const response = jsonSuccess({
        id: connection._id.toString(),
        provider: 'gmail',
        senderEmail: connection.senderEmail,
        senderName: connection.senderName,
        status: connection.status,
        verifiedAt: connection.verifiedAt?.toISOString(),
      });
      clearOAuthFlowCookies(response, request, [
        GMAIL_CONNECT_PKCE_COOKIE,
        GMAIL_CONNECT_RETURN_COOKIE,
      ]);
      return response;
    }

    return redirectToReturnBase({ status: 'connected', provider: 'gmail' });
  } catch (error) {
    console.error('[Gmail Connection Callback Error]:', error);
    if (wantsJson) {
      return handleApiError(error);
    }
    return redirectToReturnBase({ error: 'oauth_exchange_failed' });
  }
}

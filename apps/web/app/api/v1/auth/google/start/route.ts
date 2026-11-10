import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { getAppUrl } from '@/lib/url';
import {
  GOOGLE_AUTH_NONCE_COOKIE,
  GOOGLE_AUTH_PKCE_COOKIE,
  setOAuthFlowCookie,
} from '@/lib/oauth-cookies';

export async function GET(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    const client = new GmailOAuthClient({
      redirectUri: `${appUrl}/api/v1/auth/google/callback`,
    });

    if (!client.isConfigured()) {
      if (wantsJson) {
        return jsonError(
          'Google OAuth is not configured on the server yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.',
          503
        );
      }
      return NextResponse.redirect(`${appUrl}/login?error=google_oauth_not_configured`);
    }

    const oauthNonce = crypto.randomBytes(16).toString('hex');
    const state = `auth_${client.generateState(oauthNonce)}`;
    const { codeVerifier, codeChallenge } = client.generatePkcePair();
    const url = client.buildAuthorizationUrl(state, codeChallenge);

    const response = wantsJson
      ? jsonSuccess({ url, state })
      : NextResponse.redirect(url);

    setOAuthFlowCookie(response, request, GOOGLE_AUTH_NONCE_COOKIE, oauthNonce);
    setOAuthFlowCookie(response, request, GOOGLE_AUTH_PKCE_COOKIE, codeVerifier);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

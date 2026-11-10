import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { getAppUrl } from '@/lib/url';
import { appendQueryParam, sanitizeRelativeReturnPath } from '@/lib/oauth-helpers';
import {
  GMAIL_CONNECT_PKCE_COOKIE,
  GMAIL_CONNECT_RETURN_COOKIE,
  setOAuthFlowCookie,
} from '@/lib/oauth-cookies';

export async function GET(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const rawReturnTo = request.nextUrl.searchParams.get('returnTo');
    const normalizedReturnTo =
      rawReturnTo === '/workspace'
        ? '/workspace?tab=sending'
        : sanitizeRelativeReturnPath(rawReturnTo, '/connect');
    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    const session = await resolveAuthSession(request);
    if (!session) {
      if (wantsJson) {
        return jsonError('Authentication required', 401);
      }
      return NextResponse.redirect(
        `${appUrl}/login?redirect=${encodeURIComponent(normalizedReturnTo)}`
      );
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl}/api/v1/connections/gmail/callback`;
    const client = new GmailOAuthClient({ redirectUri });

    if (!client.isConfigured()) {
      if (wantsJson) {
        return jsonError(
          'Google OAuth is not configured on the server yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables and redeploy.',
          503
        );
      }
      return NextResponse.redirect(
        `${appUrl}${appendQueryParam(normalizedReturnTo, 'error', 'google_oauth_not_configured')}`
      );
    }

    const state = client.generateState(session._id.toString());
    const { codeVerifier, codeChallenge } = client.generatePkcePair();
    const url = client.buildAuthorizationUrl(state, codeChallenge);

    const response = wantsJson
      ? jsonSuccess({ url, state })
      : NextResponse.redirect(url);

    setOAuthFlowCookie(response, request, GMAIL_CONNECT_PKCE_COOKIE, codeVerifier);
    setOAuthFlowCookie(response, request, GMAIL_CONNECT_RETURN_COOKIE, normalizedReturnTo);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

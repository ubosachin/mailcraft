import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveGuestSession, createGuestSession, setSessionCookie } from '@/lib/session';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    let session = await resolveGuestSession(request);
    let cookieToken: string | null = null;

    if (!session) {
      const created = await createGuestSession(request);
      session = created.session;
      cookieToken = created.token;
    }

    const client = new GmailOAuthClient();
    const state = `auth_${client.generateState(session._id.toString())}`;
    const url = client.buildAuthorizationUrl(state);

    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    if (wantsJson) {
      return jsonSuccess({ url, state });
    }

    const response = NextResponse.redirect(url);
    if (cookieToken) {
      setSessionCookie(response, cookieToken, session.expiresAt);
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}


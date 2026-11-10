import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const client = new GmailOAuthClient();
    const state = client.generateState(session._id.toString());
    const url = client.buildAuthorizationUrl(state);

    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    if (wantsJson) {
      return jsonSuccess({ url, state });
    }

    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error);
  }
}


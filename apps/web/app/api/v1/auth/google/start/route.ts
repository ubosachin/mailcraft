import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

const OAUTH_NONCE_COOKIE = 'mailcraft_oauth_nonce';

export async function GET(request: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const client = new GmailOAuthClient({
      redirectUri: `${appUrl}/api/v1/auth/google/callback`,
    });

    const oauthNonce = crypto.randomBytes(16).toString('hex');
    const state = `auth_${client.generateState(oauthNonce)}`;
    const url = client.buildAuthorizationUrl(state);

    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    const response = wantsJson
      ? jsonSuccess({ url, state })
      : NextResponse.redirect(url);

    response.cookies.set({
      name: OAUTH_NONCE_COOKIE,
      value: oauthNonce,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

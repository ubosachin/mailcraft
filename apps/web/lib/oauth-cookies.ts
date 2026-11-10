import { NextRequest, NextResponse } from 'next/server';
import { shouldUseSecureCookie } from './session';

const OAUTH_FLOW_COOKIE_TTL_SECONDS = 600; // 10 minutes

export const GOOGLE_AUTH_NONCE_COOKIE = 'mailcraft_oauth_nonce';
export const GOOGLE_AUTH_PKCE_COOKIE = 'mailcraft_oauth_pkce_verifier';
export const GMAIL_CONNECT_PKCE_COOKIE = 'mailcraft_gmail_pkce_verifier';
export const GMAIL_CONNECT_RETURN_COOKIE = 'mailcraft_gmail_return_to';

/**
 * Sets a short-lived HttpOnly cookie used during Google OAuth state / PKCE verification.
 */
export function setOAuthFlowCookie(
  response: NextResponse,
  request: NextRequest,
  name: string,
  value: string
): void {
  response.cookies.set({
    name,
    value,
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_FLOW_COOKIE_TTL_SECONDS,
  });
}

/**
 * Clears temporary OAuth state / PKCE cookies once an authorization flow completes or fails.
 */
export function clearOAuthFlowCookies(
  response: NextResponse,
  request: NextRequest,
  names: string[]
): void {
  const secure = shouldUseSecureCookie(request);
  for (const name of names) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
}


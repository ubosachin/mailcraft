import { NextRequest, NextResponse } from 'next/server';
import { getAllowedOrigins } from './lib/url';

const PROTECTED_PAGE_PREFIXES = [
  '/workspace',
  '/templates',
  '/editor',
  '/campaigns',
  '/contacts',
  '/analytics',
  '/connect',
  '/suppression',
  '/settings',
];

export function middleware(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins(request);
  const corsOrigin =
    requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : null;
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');

  // Redirect unauthenticated users away from protected studio routes
  if (!isApi) {
    const isProtected = PROTECTED_PAGE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isProtected) {
      const sessionCookie = request.cookies.get('mailcraft_session')?.value;
      if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Handle CORS preflight OPTIONS requests for API
  if (isApi && request.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, X-Session-Id, X-Campaign-Id',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (corsOrigin) {
      preflightHeaders['Access-Control-Allow-Origin'] = corsOrigin;
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Strict-Transport-Security in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content-Security-Policy (Permissive for Google Fonts, data URLs, Cloudinary, and Next.js hydration)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-ancestors 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // CORS headers on API responses for trusted origins only
  if (isApi) {
    response.headers.set('Vary', 'Origin');
    if (corsOrigin) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


import type { NextRequest } from 'next/server';

export const PRODUCTION_APP_URL = 'https://web-tawny-three-j5f5132mxd.vercel.app';

/**
 * Resolves the canonical public application URL from env, incoming request headers,
 * Vercel deployment variables, or the configured production URL.
 */
export function getAppUrl(request?: NextRequest): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
    if (request.nextUrl?.origin && request.nextUrl.origin !== 'null') {
      return request.nextUrl.origin.replace(/\/+$/, '');
    }
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '');
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_APP_URL : 'http://localhost:3000';
}

/**
 * Builds the set of trusted origins permitted for credentialed CORS API calls.
 */
export function getAllowedOrigins(request?: NextRequest): Set<string> {
  const origins = new Set<string>([PRODUCTION_APP_URL]);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.add(process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, ''));
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, ''));
  }
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`.replace(/\/+$/, ''));
  }
  if (request?.nextUrl?.origin && request.nextUrl.origin !== 'null') {
    origins.add(request.nextUrl.origin.replace(/\/+$/, ''));
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}


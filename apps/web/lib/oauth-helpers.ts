/**
 * Client- and server-safe helpers for OAuth return URLs, API error normalization,
 * and human-readable Google OAuth error messages.
 */

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_not_configured:
    'Google OAuth is not configured on the server yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables and redeploy.',
  invalid_oauth_state: 'Google OAuth security verification expired or failed. Please try connecting again.',
  invalid_or_expired_oauth_state:
    'Google OAuth state expired or did not match your session. Please try again.',
  oauth_exchange_failed: 'Google token exchange failed. Verify your Google Cloud Console redirect URIs and try again.',
  missing_refresh_token:
    'Google did not return a refresh token. Revoke MailCraft access in your Google Account permissions and reconnect.',
  missing_oauth_code: 'Google OAuth callback was missing an authorization code. Please try again.',
  authentication_required: 'Please log in to your MailCraft workspace before connecting Gmail.',
  access_denied: 'Google OAuth permission was declined before connecting.',
};

/**
 * Ensures OAuth redirects stay strictly on relative in-app paths and cannot open-redirect.
 */
export function sanitizeRelativeReturnPath(
  candidate: string | null | undefined,
  fallback: string
): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }
  return candidate;
}

/**
 * Appends a query parameter cleanly whether or not the relative path already contains '?'.
 */
export function appendQueryParam(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

/**
 * Extracts an error message cleanly from MailCraft JSON responses.
 */
export function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as {
    error?: unknown;
    message?: unknown;
    details?: {
      errors?: Array<{ message?: unknown }>;
    } | Array<{ message?: unknown }>;
  };

  let base = '';
  if (typeof record.error === 'string' && record.error.trim()) {
    base = record.error;
  } else if (
    record.error &&
    typeof record.error === 'object' &&
    'message' in record.error &&
    typeof (record.error as { message?: unknown }).message === 'string'
  ) {
    base = (record.error as { message: string }).message;
  } else if (typeof record.message === 'string' && record.message.trim()) {
    base = record.message;
  }

  const nestedErrors = Array.isArray(record.details)
    ? record.details
    : Array.isArray(record.details?.errors)
    ? record.details.errors
    : [];
  const detailMessages = nestedErrors
    .map((item) => (typeof item?.message === 'string' ? item.message.trim() : ''))
    .filter(Boolean);

  if (detailMessages.length > 0) {
    const joined = detailMessages.join(' ');
    if (!base) return joined;
    return base.includes(detailMessages[0]) ? base : `${base}: ${joined}`;
  }

  return base || fallback;
}

/**
 * Converts OAuth callback error query codes into user-friendly explanations.
 */
export function getOAuthErrorMessage(code: string): string {
  const trimmed = code.trim();
  return OAUTH_ERROR_MESSAGES[trimmed] || `Google OAuth failed (${trimmed}). Please try again.`;
}


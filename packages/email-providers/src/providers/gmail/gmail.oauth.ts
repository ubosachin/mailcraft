import crypto from 'node:crypto';
import { AuthenticationFailedError } from '../../errors/provider.errors.js';

export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface GoogleUserInfo {
  email: string;
  verifiedEmail: boolean;
  name?: string;
  picture?: string;
}

export class GmailOAuthClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(options?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  }) {
    this.clientId = options?.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = options?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    const defaultAppUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : '') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://web-tawny-three-j5f5132mxd.vercel.app'
        : 'http://localhost:3000')
    ).replace(/\/+$/, '');

    this.redirectUri =
      options?.redirectUri ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${defaultAppUrl}/api/v1/connections/gmail/callback`;
  }

  /**
   * Generates cryptographically secure signed state bound to user session to prevent CSRF.
   */
  generateState(sessionId: string): string {
    const secret = process.env.APP_SECRET || 'mailcraft_oauth_state_secret_2026';
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${nonce}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /**
   * Validates state and ensures it belongs to the active user session and is not expired (max 15 mins).
   */
  validateState(rawState: string, expectedSessionId: string): boolean {
    try {
      const decoded = Buffer.from(rawState, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return false;

      const [sessId, tsStr, nonce, sig] = parts;
      if (sessId !== expectedSessionId) return false;
      if (!sig || sig.length !== 64 || !/^[0-9a-f]{64}$/i.test(sig)) return false;

      const ts = Number(tsStr);
      if (isNaN(ts) || Date.now() - ts > 15 * 60 * 1000) {
        // Expired after 15 minutes
        return false;
      }

      const secret = process.env.APP_SECRET || 'mailcraft_oauth_state_secret_2026';
      const payload = `${sessId}:${tsStr}:${nonce}`;
      const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Builds the official Google OAuth 2.0 authorization URL with narrow gmail.send scope.
   */
  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent', // Ensures refresh_token is returned
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access & refresh tokens.
   */
  async exchangeCode(code: string): Promise<GoogleOAuthTokens> {
    if (!this.clientId || !this.clientSecret) {
      throw new AuthenticationFailedError(
        'gmail',
        'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured.'
      );
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AuthenticationFailedError(
        'gmail',
        `Google OAuth token exchange failed (${res.status}): ${JSON.stringify(err)}`
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Fetches the user profile info to identify the verified Gmail sender address.
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      throw new AuthenticationFailedError('gmail', 'Failed to retrieve user profile from Google');
    }

    const data = (await profileRes.json()) as {
      email: string;
      verified_email?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      email: data.email,
      verifiedEmail: data.verified_email ?? true,
      name: data.name,
      picture: data.picture,
    };
  }

  /**
   * Refreshes access token using the stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    if (!this.clientId || !this.clientSecret) {
      throw new AuthenticationFailedError(
        'gmail',
        'Google OAuth credentials are not configured on the server.'
      );
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AuthenticationFailedError(
        'gmail',
        `Google token refresh failed: ${JSON.stringify(err)}`
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }
}

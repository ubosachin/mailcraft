import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
} from '@mailcraft/database';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { getAppUrl } from '@/lib/url';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    const appUrl = getAppUrl(request);

    if (errorParam) {
      return NextResponse.redirect(`${appUrl}/connect?error=${encodeURIComponent(errorParam)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/connect?error=missing_oauth_code`);
    }

    const session = await resolveAuthSession(request);
    if (!session) {
      return NextResponse.redirect(`${appUrl}/connect?error=authentication_required`);
    }

    const client = new GmailOAuthClient({
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/v1/connections/gmail/callback`,
    });
    const isValidState = client.validateState(state, session._id.toString());
    if (!isValidState) {
      return NextResponse.redirect(`${appUrl}/connect?error=invalid_or_expired_oauth_state`);
    }

    // Exchange code for tokens
    const tokens = await client.exchangeCode(code);
    const userInfo = await client.getUserInfo(tokens.accessToken);

    await connectToDatabase();

    // Check existing connection in case Google didn't return a new refreshToken
    const existing = await EmailConnection.findOne({
      sessionId: session._id,
      provider: 'gmail',
    });

    // Decrypt existing to preserve refresh token if Google didn't re-issue it
    let finalRefreshToken = tokens.refreshToken;
    if (!finalRefreshToken && existing) {
      try {
        const { decryptCredentials } = await import('@mailcraft/database');
        const prev = decryptCredentials<{ refreshToken?: string }>(existing.encryptedCredentials);
        finalRefreshToken = prev.refreshToken;
      } catch {
        // Ignore decryption failure and redirect below if no refresh token exists
      }
    }

    if (!finalRefreshToken) {
      return NextResponse.redirect(`${appUrl}/connect?error=missing_refresh_token`);
    }

    const encryptedCredentials = encryptCredentials({
      refreshToken: finalRefreshToken,
      accessToken: tokens.accessToken,
      expiryDate: Date.now() + (tokens.expiresIn * 1000),
    });

    const connection = await EmailConnection.findOneAndUpdate(
      { sessionId: session._id, provider: 'gmail' },
      {
        $set: {
          senderEmail: userInfo.email.toLowerCase().trim(),
          senderName: userInfo.name,
          encryptedCredentials,
          credentialVersion: 1,
          status: 'connected',
          senderVerificationStatus: 'verified',
          providerAccountStatus: 'active',
          verifiedAt: new Date(),
          lastVerifiedAt: new Date(),
          lastError: null,
        },
      },
      { upsert: true, new: true }
    );

    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('format') === 'json';

    if (wantsJson) {
      return jsonSuccess({
        id: connection._id.toString(),
        provider: 'gmail',
        senderEmail: connection.senderEmail,
        senderName: connection.senderName,
        status: connection.status,
        verifiedAt: connection.verifiedAt?.toISOString(),
      });
    }

    return NextResponse.redirect(`${appUrl}/connect?status=connected&provider=gmail`);
  } catch (error) {
    return handleApiError(error);
  }
}


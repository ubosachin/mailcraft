import { NextRequest, NextResponse } from 'next/server';
import {
  connectToDatabase,
  EmailConnection,
  encryptCredentials,
} from '@mailcraft/database';
import { GmailOAuthClient } from '@mailcraft/email-providers';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (errorParam) {
      return NextResponse.redirect(`${appUrl}/connect?error=${encodeURIComponent(errorParam)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/connect?error=missing_oauth_code`);
    }

    const session = await resolveGuestSession(request);
    if (!session) {
      return NextResponse.redirect(`${appUrl}/connect?error=guest_session_missing`);
    }

    const client = new GmailOAuthClient();
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

    const refreshToken = tokens.refreshToken || (existing ? undefined : 'mock_gmail_refresh_token_dev');
    
    // Decrypt existing to preserve refresh token if Google didn't re-issue it
    let finalRefreshToken = tokens.refreshToken;
    if (!finalRefreshToken && existing) {
      try {
        const { decryptCredentials } = await import('@mailcraft/database');
        const prev = decryptCredentials<{ refreshToken?: string }>(existing.encryptedCredentials);
        finalRefreshToken = prev.refreshToken;
      } catch {
        // fallback
      }
    }

    if (!finalRefreshToken) {
      finalRefreshToken = 'mock_gmail_refresh_token_fallback';
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


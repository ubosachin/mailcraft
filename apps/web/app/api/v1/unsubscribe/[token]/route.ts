import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Suppression,
  Contact,
  CampaignRecipient,
  Campaign,
  CampaignEvent,
  EmailEvent,
  UnsubscribeEvent,
  encryptCredentials,
} from '@mailcraft/database';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    let payload: { c?: string; e: string; t?: number };
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      payload = JSON.parse(decoded);
    } catch {
      return jsonError('Invalid or corrupted unsubscribe token', 400);
    }

    const email = payload.e?.toLowerCase().trim();
    if (!email) {
      return jsonError('Email missing from unsubscribe token', 400);
    }

    return jsonSuccess({
      email,
      campaignId: payload.c || null,
      isValid: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    let payload: { c?: string; e: string; t?: number };
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      payload = JSON.parse(decoded);
    } catch {
      return jsonError('Invalid or corrupted unsubscribe token', 400);
    }

    const email = payload.e?.toLowerCase().trim();
    if (!email) {
      return jsonError('Email missing from unsubscribe token', 400);
    }

    await connectToDatabase();

    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const encrypted = encryptCredentials(email);

    let campaign = null;
    if (payload.c) {
      campaign = await Campaign.findById(payload.c);
    }

    const isOneClickHeader =
      request.headers.get('list-unsubscribe-post') === 'List-Unsubscribe=One-Click' ||
      request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');

    const source = isOneClickHeader ? 'one_click_header' : 'landing_page';

    // 1. Add to global suppressions table
    await Suppression.findOneAndUpdate(
      { emailHash, scope: 'global' },
      {
        $set: {
          emailEncrypted: encrypted.data,
          reason: 'unsubscribe',
          scope: 'global',
          sessionId: campaign?.sessionId || null,
          metadata: {
            campaignId: campaign?._id?.toString(),
            source,
            reasonDetail: 'Recipient triggered unsubscribe link',
          },
        },
      },
      { upsert: true, new: true }
    );

    // 2. Mark contacts as unsubscribed
    await Contact.updateMany(
      { normalizedEmail: email },
      { $set: { consentStatus: 'unsubscribed' } }
    );

    // 3. Record UnsubscribeEvent
    if (campaign?.sessionId) {
      try {
        await UnsubscribeEvent.create({
          sessionId: campaign.sessionId,
          campaignId: campaign._id,
          emailHash,
          source,
          unsubscribedAt: new Date(),
          tokenHash,
        });
      } catch (unsubErr) {
        console.error('[Unsubscribe] Failed to write UnsubscribeEvent:', unsubErr);
      }
    }

    // 4. Update recipient records & campaign stats
    if (campaign) {
      await CampaignRecipient.updateMany(
        { campaignId: campaign._id, email },
        { $set: { status: 'unsubscribed' } }
      );

      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { 'stats.unsubscribed': 1 } }
      );

      await CampaignEvent.create({
        campaignId: campaign._id,
        eventType: 'unsubscribed',
        metadata: { email, source },
        occurredAt: new Date(),
      });

      if (campaign.sessionId) {
        await EmailEvent.create({
          sessionId: campaign.sessionId,
          campaignId: campaign._id,
          provider: campaign.provider || 'generic',
          eventType: 'unsubscribed',
          eventTimestamp: new Date(),
          eventId: `unsub_${emailHash}_${Date.now()}`,
          metadata: { source },
          processingStatus: 'processed',
        });
      }
    }

    console.log(`[Unsubscribe] Recipient ${email} successfully suppressed via ${source}.`);

    return jsonSuccess({
      email,
      status: 'unsubscribed',
      unsubscribed: true,
      source,
      message: `You (${email}) have been successfully unsubscribed. You will not receive future promotional broadcasts.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

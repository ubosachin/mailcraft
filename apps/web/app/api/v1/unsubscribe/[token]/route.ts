import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Suppression,
  Contact,
  CampaignRecipient,
  Campaign,
  CampaignEvent,
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
    const encrypted = encryptCredentials(email);

    let campaign = null;
    if (payload.c) {
      campaign = await Campaign.findById(payload.c);
    }

    // 1. Add to global suppressions table
    await Suppression.findOneAndUpdate(
      { emailHash, scope: 'global' },
      {
        $set: {
          emailEncrypted: encrypted.data,
          reason: 'unsubscribe',
          scope: 'global',
          sessionId: campaign?.sessionId || null,
        },
      },
      { upsert: true }
    );

    // 2. Mark contacts as unsubscribed
    await Contact.updateMany(
      { email },
      { $set: { consentStatus: 'unsubscribed' } }
    );

    // 3. If campaign associated, update recipient record & events
    if (campaign) {
      await CampaignRecipient.updateMany(
        { campaignId: campaign._id, email },
        { $set: { status: 'unsubscribed' } }
      );

      campaign.stats.unsubscribed += 1;
      await campaign.save();

      await CampaignEvent.create({
        campaignId: campaign._id,
        eventType: 'unsubscribed',
        metadata: { email, source: 'one_click_unsubscribe' },
        occurredAt: new Date(),
      });
    }

    console.log(`[Unsubscribe] Recipient ${email} successfully suppressed.`);

    return jsonSuccess({
      email,
      status: 'unsubscribed',
      unsubscribed: true,
      message: `You (${email}) have been successfully unsubscribed. You will not receive future promotional broadcasts.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


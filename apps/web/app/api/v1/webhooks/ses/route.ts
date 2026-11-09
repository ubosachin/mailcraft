import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  CampaignEvent,
  Suppression,
  encryptCredentials,
} from '@mailcraft/database';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    let body: Record<string, unknown> = {};

    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Invalid JSON payload', 400);
    }

    // Handle AWS SNS SubscriptionConfirmation
    if (body.Type === 'SubscriptionConfirmation' && typeof body.SubscribeURL === 'string') {
      console.log('[SES Webhook] Confirming subscription via:', body.SubscribeURL);
      await fetch(body.SubscribeURL);
      return jsonSuccess({ subscriptionConfirmed: true });
    }

    let messageObj: Record<string, unknown> = body;
    if (typeof body.Message === 'string') {
      try {
        messageObj = JSON.parse(body.Message);
      } catch {
        // Not a JSON message string
      }
    }

    const notificationType = (messageObj.notificationType as string) || (messageObj.eventType as string);
    const mail = messageObj.mail as Record<string, unknown> | undefined;
    const messageId = mail?.messageId as string | undefined;

    if (!notificationType) {
      return jsonSuccess({ acknowledged: true, note: 'No notificationType detected' });
    }

    await connectToDatabase();

    const recipient = messageId
      ? await CampaignRecipient.findOne({ providerMessageId: messageId })
      : null;

    if (!recipient) {
      return jsonSuccess({ acknowledged: true, match: false });
    }

    const campaign = await Campaign.findById(recipient.campaignId);

    if (notificationType === 'Delivery') {
      recipient.status = 'delivered';
      recipient.deliveredAt = new Date();
      await recipient.save();

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: 'delivered',
        metadata: { provider: 'ses' },
        occurredAt: new Date(),
      });
    } else if (notificationType === 'Bounce') {
      recipient.status = 'bounced';
      recipient.errorCode = 'SES_BOUNCE';
      await recipient.save();

      if (campaign) {
        campaign.stats.bounced += 1;
        await campaign.save();
      }

      const emailHash = crypto.createHash('sha256').update(recipient.email.toLowerCase().trim()).digest('hex');
      const encrypted = encryptCredentials(recipient.email);
      await Suppression.findOneAndUpdate(
        { emailHash, scope: 'global' },
        {
          $set: {
            emailEncrypted: encrypted.data,
            reason: 'bounce',
            scope: 'global',
          },
        },
        { upsert: true }
      );

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: 'bounced',
        metadata: { provider: 'ses' },
        occurredAt: new Date(),
      });
    } else if (notificationType === 'Complaint') {
      recipient.status = 'unsubscribed';
      await recipient.save();

      if (campaign) {
        campaign.stats.unsubscribed += 1;
        await campaign.save();
      }

      const emailHash = crypto.createHash('sha256').update(recipient.email.toLowerCase().trim()).digest('hex');
      const encrypted = encryptCredentials(recipient.email);
      await Suppression.findOneAndUpdate(
        { emailHash, scope: 'global' },
        {
          $set: {
            emailEncrypted: encrypted.data,
            reason: 'complaint',
            scope: 'global',
          },
        },
        { upsert: true }
      );

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: 'complained',
        metadata: { provider: 'ses' },
        occurredAt: new Date(),
      });
    }

    return jsonSuccess({ acknowledged: true, notificationType });
  } catch (error) {
    return handleApiError(error);
  }
}


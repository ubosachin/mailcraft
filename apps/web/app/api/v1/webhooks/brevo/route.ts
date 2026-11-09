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
    const body = await request.json();
    const event = body.event || body['event-type'];
    const email = (body.email || '').toLowerCase().trim();
    const messageId = body['message-id'] || body.messageId;

    if (!email || !event) {
      return jsonError('Missing email or event type in webhook', 400);
    }

    await connectToDatabase();

    // Find recipient record by messageId or email
    const recipient = messageId
      ? await CampaignRecipient.findOne({ providerMessageId: messageId }).sort({ createdAt: -1 })
      : await CampaignRecipient.findOne({ email }).sort({ createdAt: -1 });

    if (!recipient) {
      // Event for untracked or external message
      return jsonSuccess({ acknowledged: true, match: false });
    }

    const campaign = await Campaign.findById(recipient.campaignId);

    // Map Brevo event to our standard CampaignEventType
    if (event === 'delivered') {
      recipient.status = 'delivered';
      recipient.deliveredAt = new Date();
      await recipient.save();

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: 'delivered',
        metadata: { provider: 'brevo', raw: body },
        occurredAt: new Date(),
      });
    } else if (event === 'hard_bounce' || event === 'soft_bounce') {
      recipient.status = 'bounced';
      recipient.errorCode = event.toUpperCase();
      recipient.errorMessage = body.reason || 'Email rejected by recipient mail server';
      await recipient.save();

      if (campaign) {
        campaign.stats.bounced += 1;
        await campaign.save();
      }

      // Add to suppressions
      const emailHash = crypto.createHash('sha256').update(email).digest('hex');
      const encrypted = encryptCredentials(email);
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
        metadata: { reason: recipient.errorMessage },
        occurredAt: new Date(),
      });
    } else if (event === 'click') {
      if (campaign) {
        campaign.stats.clicked += 1;
        await campaign.save();
      }

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: 'clicked',
        metadata: { link: body.link },
        occurredAt: new Date(),
      });
    } else if (event === 'unsubscribe' || event === 'spam') {
      recipient.status = 'unsubscribed';
      await recipient.save();

      if (campaign) {
        campaign.stats.unsubscribed += 1;
        await campaign.save();
      }

      const emailHash = crypto.createHash('sha256').update(email).digest('hex');
      const encrypted = encryptCredentials(email);
      await Suppression.findOneAndUpdate(
        { emailHash, scope: 'global' },
        {
          $set: {
            emailEncrypted: encrypted.data,
            reason: event === 'spam' ? 'complaint' : 'unsubscribe',
            scope: 'global',
          },
        },
        { upsert: true }
      );

      await CampaignEvent.create({
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
        eventType: event === 'spam' ? 'complained' : 'unsubscribed',
        metadata: { provider: 'brevo' },
        occurredAt: new Date(),
      });
    }

    return jsonSuccess({ acknowledged: true, event, email });
  } catch (error) {
    return handleApiError(error);
  }
}


import crypto from 'node:crypto';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  EmailEvent,
  Suppression,
  WebhookEventLog,
  encryptCredentials,
} from '@mailcraft/database';
import { EmailEventType } from '@mailcraft/shared-types';

export interface NormalizedWebhookEvent {
  provider: 'brevo' | 'ses' | 'generic';
  eventId: string;
  providerMessageId?: string;
  recipientEmail: string;
  eventType: EmailEventType;
  eventTimestamp: Date;
  metadata?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  signatureValid: boolean;
  headers?: Record<string, string>;
}

export async function processNormalizedWebhookEvent(
  event: NormalizedWebhookEvent
): Promise<{ success: boolean; deduplicated?: boolean; error?: string }> {
  await connectToDatabase();

  const emailNorm = event.recipientEmail.toLowerCase().trim();
  const emailHash = crypto.createHash('sha256').update(emailNorm).digest('hex');

  // 1. Audit log raw webhook
  try {
    await WebhookEventLog.create({
      provider: event.provider,
      eventId: event.eventId,
      signatureValid: event.signatureValid,
      rawHeaders: event.headers || {},
      rawPayload: event.rawPayload,
      processingStatus: 'processed',
      receivedAt: new Date(),
    });
  } catch (logErr) {
    console.error('[WebhookProcessor] Error writing WebhookEventLog:', logErr);
  }

  // 2. Event deduplication check
  const existingEvent = await EmailEvent.findOne({
    provider: event.provider,
    eventId: event.eventId,
  });

  if (existingEvent) {
    return { success: true, deduplicated: true };
  }

  // 3. Resolve recipient record
  let recipient = null;
  if (event.providerMessageId) {
    recipient = await CampaignRecipient.findOne({
      providerMessageId: event.providerMessageId,
    }).sort({ createdAt: -1 });
  }

  if (!recipient && emailNorm) {
    recipient = await CampaignRecipient.findOne({
      email: emailNorm,
    }).sort({ createdAt: -1 });
  }

  const campaign = recipient ? await Campaign.findById(recipient.campaignId) : null;
  const sessionId = campaign?.sessionId || recipient?.sessionId;

  // 4. Update recipient status & campaign stats (state machine transitions)
  if (recipient) {
    const currentStatus = recipient.status;

    // Terminal statuses cannot be downgraded by weaker delayed events
    const isTerminal = ['delivered', 'bounced', 'unsubscribed'].includes(currentStatus);

    switch (event.eventType) {
      case 'delivered':
        if (currentStatus !== 'bounced' && currentStatus !== 'unsubscribed') {
          recipient.status = 'delivered';
          recipient.deliveredAt = event.eventTimestamp;
          if (campaign && currentStatus !== 'delivered') {
            campaign.stats.delivered += 1;
          }
        }
        break;

      case 'hard_bounce':
        recipient.status = 'bounced';
        recipient.bouncedAt = event.eventTimestamp;
        recipient.errorCode = 'HARD_BOUNCE';
        recipient.errorMessage = String(event.metadata?.reason || 'Hard bounce rejected by mailbox provider');
        recipient.lastErrorCode = recipient.errorCode;
        recipient.lastErrorMessage = recipient.errorMessage;
        if (campaign && currentStatus !== 'bounced') {
          campaign.stats.bounced += 1;
        }
        break;

      case 'soft_bounce':
        if (!isTerminal) {
          recipient.status = 'bounced';
          recipient.bouncedAt = event.eventTimestamp;
          recipient.errorCode = 'SOFT_BOUNCE';
          recipient.errorMessage = String(event.metadata?.reason || 'Temporary mailbox delay or quota full');
          recipient.lastErrorCode = recipient.errorCode;
          recipient.lastErrorMessage = recipient.errorMessage;
          if (campaign && currentStatus !== 'bounced') {
            campaign.stats.bounced += 1;
          }
        }
        break;

      case 'complaint':
        recipient.status = 'bounced';
        recipient.errorCode = 'SPAM_COMPLAINT';
        recipient.errorMessage = 'Spam complaint reported by recipient';
        recipient.lastErrorCode = recipient.errorCode;
        recipient.lastErrorMessage = recipient.errorMessage;
        if (campaign && currentStatus !== 'bounced') {
          campaign.stats.bounced += 1;
        }
        break;

      case 'unsubscribed':
        recipient.status = 'unsubscribed';
        if (campaign && currentStatus !== 'unsubscribed') {
          campaign.stats.unsubscribed += 1;
        }
        break;

      case 'clicked':
        if (campaign) {
          campaign.stats.clicked += 1;
        }
        break;

      case 'opened':
        // Opens are tracked in EmailEvents collection
        break;

      case 'deferred':
        if (!isTerminal && currentStatus !== 'delivered') {
          recipient.status = 'processing';
        }
        break;

      case 'failed':
      case 'rejected':
        if (!isTerminal) {
          recipient.status = 'failed';
          recipient.errorCode = 'PROVIDER_REJECTED';
          recipient.errorMessage = String(event.metadata?.reason || 'Rejected by sending provider');
          recipient.lastErrorCode = recipient.errorCode;
          recipient.lastErrorMessage = recipient.errorMessage;
          if (campaign) {
            campaign.stats.failed += 1;
          }
        }
        break;
    }

    await recipient.save();
    if (campaign) {
      await campaign.save();
    }
  }

  // 5. Automatic Global Suppression for Hard Bounces and Complaints
  if (['hard_bounce', 'complaint', 'unsubscribed'].includes(event.eventType)) {
    try {
      const encrypted = encryptCredentials(emailNorm);
      const suppressionReason =
        event.eventType === 'complaint'
          ? 'complaint'
          : event.eventType === 'hard_bounce'
          ? 'hard_bounce'
          : 'unsubscribe';

      await Suppression.findOneAndUpdate(
        { emailHash, scope: 'global' },
        {
          $set: {
            emailEncrypted: JSON.stringify(encrypted),
            reason: suppressionReason,
            metadata: {
              campaignId: recipient?.campaignId?.toString(),
              source: `webhook_${event.provider}`,
              reasonDetail: String(event.metadata?.reason || event.eventType),
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (suppErr) {
      console.error('[WebhookProcessor] Failed to create suppression:', suppErr);
    }
  }

  // 6. Record normalized EmailEvent
  if (sessionId && recipient) {
    try {
      await EmailEvent.create({
        sessionId,
        campaignId: recipient.campaignId,
        campaignRecipientId: recipient._id,
        contactId: recipient.contactId,
        provider: event.provider,
        providerMessageId: event.providerMessageId || recipient.providerMessageId,
        eventType: event.eventType,
        eventTimestamp: event.eventTimestamp,
        receivedAt: new Date(),
        eventId: event.eventId,
        metadata: event.metadata || {},
        processingStatus: 'processed',
      });
    } catch (eventErr: any) {
      // Ignore duplicate key error in race condition
      if (eventErr?.code !== 11000) {
        console.error('[WebhookProcessor] Error creating EmailEvent:', eventErr);
      }
    }
  }

  return { success: true };
}

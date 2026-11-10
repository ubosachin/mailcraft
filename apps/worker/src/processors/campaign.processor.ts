import { Job } from 'bullmq';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  Brand,
  EmailConnection,
  Suppression,
  CampaignEvent,
  EmailEvent,
  reserveConnectionDailyQuota,
} from '@mailcraft/database';
import {
  createProviderFromConnection,
  IEmailProvider,
} from '@mailcraft/email-providers';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';
import { wrapEmailTracking } from '../tracking-helper.js';

export interface CampaignJobPayload {
  campaignId: string;
  batchSize?: number;
}

export async function processCampaignJob(job: Job<CampaignJobPayload>): Promise<void> {
  const { campaignId, batchSize = 25 } = job.data;
  console.log(`[Worker] Started processing campaign ${campaignId} (Job: ${job.id})`);

  await connectToDatabase();

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Check scheduled status
  if (campaign.status === 'scheduled') {
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      console.log(`[Worker] Campaign ${campaignId} scheduled for future execution: ${campaign.scheduledAt.toISOString()}`);
      return;
    }
  }

  if (campaign.status === 'cancelled' || campaign.status === 'paused') {
    console.log(`[Worker] Campaign ${campaignId} is ${campaign.status}, skipping execution.`);
    return;
  }

  campaign.status = 'sending';
  if (!campaign.startedAt) {
    campaign.startedAt = new Date();
  }
  await campaign.save();

  const brand = await Brand.findById(campaign.brandId);
  if (!brand) {
    campaign.status = 'failed';
    await campaign.save();
    throw new Error(`Brand ${campaign.brandId} not found for campaign ${campaignId}`);
  }

  // Resolve provider - strictly require an active connected email provider
  if (!campaign.connectionId) {
    campaign.status = 'failed';
    await campaign.save();
    throw new Error(`Campaign ${campaignId} has no sending provider connection assigned.`);
  }

  const connection = await EmailConnection.findById(campaign.connectionId);
  if (!connection || connection.status !== 'connected') {
    campaign.status = 'failed';
    await campaign.save();
    throw new Error(`Sending provider connection for campaign ${campaignId} is missing or disconnected.`);
  }

  const provider: IEmailProvider = createProviderFromConnection(connection);

  await provider.connect();

  // Stalled job recovery: recover any recipients previously stuck in 'processing' status from a crashed worker
  await CampaignRecipient.updateMany(
    { campaignId: campaign._id, status: 'processing' },
    { $set: { status: 'queued' } }
  );

  const editorSchema = (campaign.editorData as unknown as IEditorSchema) || {
    settings: {
      background: '#FFFFFF',
      contentWidth: 600,
      fontFamily: 'sans-serif',
    },
    blocks: [],
  };

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    (process.env.NODE_ENV === 'production'
      ? 'https://web-tawny-three-j5f5132mxd.vercel.app'
      : 'http://localhost:3000')
  ).replace(/\/+$/, '');

  // Process recipients in chunks
  let hasMore = true;
  while (hasMore) {
    // Check if campaign was paused or cancelled mid-execution
    const freshCampaign = await Campaign.findById(campaignId);
    if (freshCampaign?.status === 'paused') {
      console.log(`[Worker] Campaign ${campaignId} was paused during execution.`);
      await provider.disconnect();
      return;
    }

    if (freshCampaign?.status === 'cancelled') {
      console.log(`[Worker] Campaign ${campaignId} was cancelled during execution.`);
      // Mark remaining pending/queued recipients as cancelled
      await CampaignRecipient.updateMany(
        { campaignId: campaign._id, status: { $in: ['pending', 'queued', 'processing'] } },
        { $set: { status: 'cancelled' } }
      );
      await provider.disconnect();
      return;
    }

    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      status: { $in: ['pending', 'queued'] },
    }).limit(batchSize);

    if (recipients.length === 0) {
      hasMore = false;
      break;
    }

    // Mark as processing
    const recipientIds = recipients.map((r) => r._id);
    await CampaignRecipient.updateMany(
      { _id: { $in: recipientIds } },
      { $set: { status: 'processing' } }
    );

    for (const recipient of recipients) {
      const emailLower = recipient.email.toLowerCase().trim();
      const hash = crypto.createHash('sha256').update(emailLower).digest('hex');

      // Real-time suppression recheck immediately before delivery
      const isSuppressed = await Suppression.exists({
        emailHash: hash,
        $or: [{ scope: 'global' }, { sessionId: campaign.sessionId }],
      });

      if (isSuppressed) {
        recipient.status = 'skipped';
        recipient.errorCode = 'SUPPRESSED';
        recipient.errorMessage = 'Recipient suppressed prior to individual delivery';
        recipient.lastErrorCode = 'SUPPRESSED';
        recipient.lastErrorMessage = recipient.errorMessage;
        await recipient.save();
        campaign.stats.unsubscribed++;
        continue;
      }

      // Generate signed unsubscribe token
      const unsubToken = Buffer.from(
        JSON.stringify({
          c: campaignId,
          e: recipient.email,
          t: Date.now(),
        })
      ).toString('base64url');

      const unsubscribeUrl = `${appUrl}/unsubscribe/${unsubToken}`;

      // Personalization resolution
      const persData = recipient.personalizationData || {};
      const firstName = String(persData.firstName || '').trim();
      const lastName = String(persData.lastName || '').trim();
      const company = String(persData.company || '').trim();
      const couponCode = String(persData.couponCode || '').trim();

      // Compile email
      const compiled = compileEmail({
        schema: editorSchema,
        brand: {
          brandName: brand.brandName,
          logoUrl: brand.logoUrl,
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          footerAddress: brand.footerAddress,
        },
        recipient: {
          email: recipient.email,
          unsubscribeUrl,
        },
      });

      // Apply dynamic variable interpolation across HTML, Text, and Subject
      let html = compiled.html;
      let text = compiled.text;
      let subject = campaign.subject;

      const replacements: Record<string, string> = {
        '{{first_name}}': firstName || 'there',
        '{{last_name}}': lastName || '',
        '{{company}}': company || '',
        '{{brand_name}}': brand.brandName,
        '{{coupon_code}}': couponCode,
        '{{website_url}}': brand.website || appUrl,
        '{{unsubscribe_url}}': unsubscribeUrl,
      };

      for (const [key, val] of Object.entries(replacements)) {
        const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'gi');
        html = html.replace(regex, val);
        text = text.replace(regex, val);
        subject = subject.replace(regex, val);
      }

      // Inject secure click and open tracking tokens
      html = await wrapEmailTracking(html, {
        appUrl,
        campaignId: campaign._id,
        recipientId: recipient._id,
        contactId: recipient.contactId,
        sessionId: campaign.sessionId,
      });

      try {
        const quota = await reserveConnectionDailyQuota(connection._id);
        if (!quota.allowed) {
          await CampaignRecipient.updateMany(
            { campaignId: campaign._id, status: 'processing' },
            { $set: { status: 'queued' } }
          );
          campaign.status = 'paused';
          campaign.pausedAt = new Date();
          await campaign.save();
          await provider.disconnect();
          console.warn(`[Worker] Daily sending quota reached for connection ${connection._id}. Paused campaign ${campaignId}.`);
          return;
        }

        const sendResult = await provider.sendEmail({
          to: recipient.email,
          from: brand.senderEmail || connection.senderEmail,
          fromName: brand.senderName || brand.brandName,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Campaign-Id': campaignId,
          },
        });

        recipient.status = 'accepted';
        recipient.provider = sendResult.provider;
        recipient.providerMessageId = sendResult.messageId;
        recipient.sentAt = new Date();
        recipient.acceptedAt = new Date();
        recipient.attempts += 1;
        await recipient.save();

        campaign.stats.accepted += 1;

        // Record normalized EmailEvents
        const eventId = `send_${recipient._id}_${Date.now()}`;
        await EmailEvent.create({
          sessionId: campaign.sessionId,
          campaignId: campaign._id,
          campaignRecipientId: recipient._id,
          contactId: recipient.contactId,
          provider: sendResult.provider,
          providerMessageId: sendResult.messageId,
          eventType: 'provider_accepted',
          eventTimestamp: new Date(),
          eventId,
          metadata: { to: recipient.email, subject },
          processingStatus: 'processed',
        });

        await CampaignEvent.create({
          campaignId: campaign._id,
          recipientId: recipient._id,
          eventType: 'sent',
          metadata: { messageId: sendResult.messageId, provider: sendResult.provider },
          occurredAt: new Date(),
        });
      } catch (sendError) {
        const errorMsg =
          sendError instanceof Error ? sendError.message : 'Unknown dispatch error';
        const isTimeout = /timeout|timedout|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNRESET/i.test(
          errorMsg
        );

        recipient.status = 'failed';
        recipient.errorCode = isTimeout ? 'TIMEOUT_UNCERTAIN' : 'DISPATCH_ERROR';
        recipient.errorMessage = isTimeout
          ? `Provider request timed out (${errorMsg}). Message may have been accepted; not blindly retrying.`
          : errorMsg;
        recipient.lastErrorCode = recipient.errorCode;
        recipient.lastErrorMessage = recipient.errorMessage;
        recipient.attempts += 1;
        await recipient.save();

        campaign.stats.failed += 1;

        await CampaignEvent.create({
          campaignId: campaign._id,
          recipientId: recipient._id,
          eventType: 'bounced',
          metadata: { error: recipient.errorMessage, isTimeout },
          occurredAt: new Date(),
        });
      }

      // 20ms rate-limiting pacing delay
      await new Promise((r) => setTimeout(r, 20));
    }

    await campaign.save();
  }

  // Check final status
  const finalCheck = await Campaign.findById(campaignId);
  if (finalCheck?.status !== 'cancelled' && finalCheck?.status !== 'paused') {
    const sentCount = (campaign.stats.accepted || 0) + (campaign.stats.delivered || 0);
    campaign.status =
      campaign.stats.failed > 0 && sentCount > 0
        ? 'partially_completed'
        : campaign.stats.failed > 0 && sentCount === 0
        ? 'failed'
        : 'completed';
    campaign.completedAt = new Date();
    await campaign.save();
  }

  await provider.disconnect();
  console.log(
    `[Worker] Finished campaign ${campaignId}! Accepted: ${campaign.stats.accepted}, Delivered: ${campaign.stats.delivered}, Failed: ${campaign.stats.failed}, Status: ${campaign.status}`
  );
}

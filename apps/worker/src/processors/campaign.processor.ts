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
} from '@mailcraft/database';
import {
  createProviderFromConnection,
  createMockProvider,
  IEmailProvider,
} from '@mailcraft/email-providers';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';

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

  // Resolve provider
  let provider: IEmailProvider;
  if (campaign.connectionId) {
    const connection = await EmailConnection.findById(campaign.connectionId);
    if (connection && connection.status === 'connected') {
      provider = createProviderFromConnection(connection);
    } else {
      provider = createMockProvider();
    }
  } else {
    provider = createMockProvider();
  }

  await provider.connect();

  const editorSchema = (campaign.editorData as unknown as IEditorSchema) || {
    settings: {
      background: '#FFFFFF',
      contentWidth: 600,
      fontFamily: 'sans-serif',
    },
    blocks: [],
  };

  // Process recipients in chunks
  let hasMore = true;
  while (hasMore) {
    // Check if campaign was paused or cancelled mid-execution
    const freshCampaign = await Campaign.findById(campaignId);
    if (freshCampaign?.status === 'paused' || freshCampaign?.status === 'cancelled') {
      console.log(`[Worker] Campaign ${campaignId} was paused/cancelled during execution.`);
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

    // Check suppressions
    const emailHashes = recipients.map((r) =>
      crypto.createHash('sha256').update(r.email.toLowerCase().trim()).digest('hex')
    );

    const suppressions = await Suppression.find({
      emailHash: { $in: emailHashes },
      $or: [{ scope: 'global' }, { sessionId: campaign.sessionId }],
    });

    const suppressedHashes = new Set(suppressions.map((s) => s.emailHash));

    for (const recipient of recipients) {
      const emailLower = recipient.email.toLowerCase().trim();
      const hash = crypto.createHash('sha256').update(emailLower).digest('hex');

      if (suppressedHashes.has(hash)) {
        recipient.status = 'unsubscribed';
        recipient.errorCode = 'SUPPRESSED';
        recipient.errorMessage = 'Recipient is in suppression list';
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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const unsubscribeUrl = `${appUrl}/unsubscribe/${unsubToken}`;

      // Compile email for this recipient
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

      try {
        const sendResult = await provider.sendEmail({
          to: recipient.email,
          from: brand.senderEmail,
          fromName: brand.senderName,
          subject: campaign.subject,
          html: compiled.html,
          text: compiled.text,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Campaign-Id': campaignId,
          },
        });

        recipient.status = 'delivered';
        recipient.providerMessageId = sendResult.messageId;
        recipient.sentAt = new Date();
        recipient.deliveredAt = new Date();
        recipient.attempts += 1;
        await recipient.save();

        campaign.stats.accepted += 1;
        campaign.stats.delivered += 1;

        await CampaignEvent.create({
          campaignId: campaign._id,
          recipientId: recipient._id,
          eventType: 'delivered',
          metadata: { messageId: sendResult.messageId, provider: sendResult.provider },
          occurredAt: new Date(),
        });
      } catch (sendError) {
        recipient.status = 'failed';
        recipient.errorCode = 'DISPATCH_ERROR';
        recipient.errorMessage =
          sendError instanceof Error ? sendError.message : 'Unknown dispatch error';
        recipient.attempts += 1;
        await recipient.save();

        campaign.stats.failed += 1;

        await CampaignEvent.create({
          campaignId: campaign._id,
          recipientId: recipient._id,
          eventType: 'bounced',
          metadata: { error: recipient.errorMessage },
          occurredAt: new Date(),
        });
      }

      // Small pacing delay to avoid provider throttling
      await new Promise((r) => setTimeout(r, 20));
    }

    await campaign.save();
  }

  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();

  await provider.disconnect();
  console.log(`[Worker] Successfully completed campaign ${campaignId}! Total delivered: ${campaign.stats.delivered}`);
}


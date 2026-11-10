import crypto from 'node:crypto';
import { after } from 'next/server';
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
import { createProviderFromConnection, IEmailProvider } from '@mailcraft/email-providers';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';
import { transformEmailHtmlWithTracking } from './tracking-service';
import { enqueueCampaignJob, hasActiveCampaignWorker } from './queue';
import { getAppUrl } from './url';

const DEFAULT_SCHEMA: IEditorSchema = {
  settings: {
    background: '#FFFFFF',
    contentWidth: 600,
    fontFamily: 'sans-serif',
  },
  blocks: [],
};

function interpolateVariables(
  input: string,
  replacements: Record<string, string>
): string {
  let out = input;
  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'gi');
    out = out.replace(regex, val);
  }
  return out;
}

/**
 * Dispatches a single test preview email immediately via the session's active email provider.
 * Designed for instant serverless execution without requiring an external worker daemon.
 */
export async function dispatchTestEmailForCampaign(
  campaignId: string,
  testEmail: string,
  appUrl?: string
): Promise<{
  success: true;
  messageId: string;
  provider: string;
  senderEmail: string;
}> {
  await connectToDatabase();

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const brand = await Brand.findById(campaign.brandId);
  if (!brand) {
    throw new Error('Associated campaign brand profile not found');
  }

  let connection = campaign.connectionId
    ? await EmailConnection.findById(campaign.connectionId)
    : null;

  if (!connection || connection.status !== 'connected') {
    connection = await EmailConnection.findOne({
      sessionId: campaign.sessionId,
      status: 'connected',
    }).sort({ updatedAt: -1 });
  }

  if (!connection || connection.status !== 'connected') {
    throw new Error(
      'No connected email sending provider found. Connect Gmail, Gmail App Password, Brevo, or Amazon SES in Sender Accounts first.'
    );
  }

  const quota = await reserveConnectionDailyQuota(connection._id);
  if (!quota.allowed) {
    throw new Error(
      `Daily sending limit of ${quota.limit?.toLocaleString() || '1,500'} emails/day reached for this sender account. Quota resets at 00:00 UTC.`
    );
  }

  const resolvedAppUrl = (appUrl || getAppUrl()).replace(/\/+$/, '');
  const provider: IEmailProvider = createProviderFromConnection(connection);
  await provider.connect();

  try {
    const editorSchema = (campaign.editorData as unknown as IEditorSchema) || DEFAULT_SCHEMA;
    const unsubscribeUrl = `${resolvedAppUrl}/unsubscribe/test_preview`;

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
        name: 'Test Reviewer',
        email: testEmail,
        unsubscribeUrl,
      },
    });

    const replacements: Record<string, string> = {
      '{{first_name}}': 'Test',
      '{{last_name}}': 'Reviewer',
      '{{company}}': brand.brandName,
      '{{brand_name}}': brand.brandName,
      '{{coupon_code}}': 'TEST20',
      '{{website_url}}': brand.website || resolvedAppUrl,
      '{{unsubscribe_url}}': unsubscribeUrl,
    };

    const fromEmail = brand.senderEmail || connection.senderEmail;
    const sendResult = await provider.sendEmail({
      to: testEmail,
      from: fromEmail,
      fromName: `[TEST] ${brand.senderName || brand.brandName}`,
      subject: `[TEST PREVIEW] ${interpolateVariables(campaign.subject, replacements)}`,
      html: interpolateVariables(compiled.html, replacements),
      text: interpolateVariables(compiled.text, replacements),
    });

    return {
      success: true,
      messageId: sendResult.messageId,
      provider: sendResult.provider,
      senderEmail: fromEmail,
    };
  } finally {
    await provider.disconnect();
  }
}

/**
 * Executes live campaign delivery batches directly in-process.
 * Used automatically when no external BullMQ worker is attached to Redis (e.g., Vercel Serverless).
 */
export async function dispatchCampaignInline(
  campaignId: string,
  options?: { appUrl?: string; batchSize?: number; maxDurationMs?: number }
): Promise<{
  status: string;
  accepted: number;
  failed: number;
  pausedForBudget?: boolean;
}> {
  const batchSize = options?.batchSize || 25;
  const maxDurationMs = options?.maxDurationMs || 50000;
  const startedClock = Date.now();
  const resolvedAppUrl = (options?.appUrl || getAppUrl()).replace(/\/+$/, '');

  await connectToDatabase();

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (campaign.status === 'cancelled' || campaign.status === 'paused' || campaign.status === 'completed') {
    return {
      status: campaign.status,
      accepted: campaign.stats.accepted || 0,
      failed: campaign.stats.failed || 0,
    };
  }

  if (campaign.status === 'scheduled' && campaign.scheduledAt && campaign.scheduledAt > new Date()) {
    return {
      status: 'scheduled',
      accepted: campaign.stats.accepted || 0,
      failed: campaign.stats.failed || 0,
    };
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

  // Recover any recipients left in processing state from a prior interrupted run
  await CampaignRecipient.updateMany(
    { campaignId: campaign._id, status: 'processing' },
    { $set: { status: 'queued' } }
  );

  const editorSchema = (campaign.editorData as unknown as IEditorSchema) || DEFAULT_SCHEMA;
  let pausedForBudget = false;

  try {
    let hasMore = true;
    while (hasMore) {
      if (Date.now() - startedClock >= maxDurationMs) {
        pausedForBudget = true;
        break;
      }

      const freshCampaign = await Campaign.findById(campaignId);
      if (freshCampaign?.status === 'paused') {
        return {
          status: 'paused',
          accepted: campaign.stats.accepted || 0,
          failed: campaign.stats.failed || 0,
        };
      }

      if (freshCampaign?.status === 'cancelled') {
        await CampaignRecipient.updateMany(
          { campaignId: campaign._id, status: { $in: ['pending', 'queued', 'processing'] } },
          { $set: { status: 'cancelled' } }
        );
        return {
          status: 'cancelled',
          accepted: campaign.stats.accepted || 0,
          failed: campaign.stats.failed || 0,
        };
      }

      const recipients = await CampaignRecipient.find({
        campaignId: campaign._id,
        status: { $in: ['pending', 'queued'] },
      }).limit(batchSize);

      if (recipients.length === 0) {
        hasMore = false;
        break;
      }

      await CampaignRecipient.updateMany(
        { _id: { $in: recipients.map((r) => r._id) } },
        { $set: { status: 'processing' } }
      );

      for (const recipient of recipients) {
        const emailLower = recipient.email.toLowerCase().trim();
        const hash = crypto.createHash('sha256').update(emailLower).digest('hex');

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
          campaign.stats.unsubscribed += 1;
          continue;
        }

        const unsubToken = Buffer.from(
          JSON.stringify({
            c: campaignId,
            e: recipient.email,
            t: Date.now(),
          })
        ).toString('base64url');
        const unsubscribeUrl = `${resolvedAppUrl}/unsubscribe/${unsubToken}`;

        const persData = recipient.personalizationData || {};
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

        const replacements: Record<string, string> = {
          '{{first_name}}': String(persData.firstName || persData.first_name || '').trim() || 'there',
          '{{last_name}}': String(persData.lastName || persData.last_name || '').trim(),
          '{{company}}': String(persData.company || '').trim(),
          '{{brand_name}}': brand.brandName,
          '{{coupon_code}}': String(persData.couponCode || '').trim(),
          '{{website_url}}': brand.website || resolvedAppUrl,
          '{{unsubscribe_url}}': unsubscribeUrl,
        };

        let html = interpolateVariables(compiled.html, replacements);
        const text = interpolateVariables(compiled.text, replacements);
        const subject = interpolateVariables(campaign.subject, replacements);

        html = await transformEmailHtmlWithTracking(html, {
          appUrl: resolvedAppUrl,
          campaignId: campaign._id.toString(),
          campaignRecipientId: recipient._id.toString(),
          sessionId: campaign.sessionId.toString(),
          trackOpens: true,
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
            return {
              status: 'paused',
              accepted: campaign.stats.accepted || 0,
              failed: campaign.stats.failed || 0,
            };
          }

          const fromEmail = brand.senderEmail || connection.senderEmail;
          const sendResult = await provider.sendEmail({
            to: recipient.email,
            from: fromEmail,
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

          await EmailEvent.create({
            sessionId: campaign.sessionId,
            campaignId: campaign._id,
            campaignRecipientId: recipient._id,
            contactId: recipient.contactId,
            provider: sendResult.provider,
            providerMessageId: sendResult.messageId,
            eventType: 'provider_accepted',
            eventTimestamp: new Date(),
            eventId: `send_${recipient._id}_${Date.now()}`,
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

        await new Promise((r) => setTimeout(r, 20));
      }

      await campaign.save();
    }

    const remainingCount = await CampaignRecipient.countDocuments({
      campaignId: campaign._id,
      status: { $in: ['pending', 'queued', 'processing'] },
    });

    const finalCheck = await Campaign.findById(campaignId);
    if (
      remainingCount === 0 &&
      finalCheck?.status !== 'cancelled' &&
      finalCheck?.status !== 'paused'
    ) {
      const sentCount = (campaign.stats.accepted || 0) + (campaign.stats.delivered || 0);
      campaign.status =
        campaign.stats.failed > 0 && sentCount > 0
          ? 'partially_completed'
          : campaign.stats.failed > 0 && sentCount === 0
          ? 'failed'
          : 'completed';
      campaign.completedAt = new Date();
      await campaign.save();
    } else if (pausedForBudget && remainingCount > 0) {
      campaign.status = 'queued';
      await campaign.save();
    }

    return {
      status: campaign.status,
      accepted: campaign.stats.accepted || 0,
      failed: campaign.stats.failed || 0,
      pausedForBudget,
    };
  } finally {
    await provider.disconnect();
  }
}

/**
 * Triggers campaign delivery using external BullMQ workers if online,
 * or transparently executes via Next.js `after()` in serverless deployments.
 */
export async function triggerCampaignDispatch(
  campaignId: string,
  appUrl?: string
): Promise<{ mode: 'worker_queue' | 'serverless_inline'; jobId: string }> {
  const workerOnline = await hasActiveCampaignWorker();

  if (workerOnline) {
    try {
      const job = await enqueueCampaignJob(campaignId);
      return {
        mode: 'worker_queue',
        jobId: String(job.id || `camp_${campaignId}`),
      };
    } catch (queueErr) {
      console.warn('[CampaignDispatch] BullMQ enqueue failed, falling back to serverless inline:', queueErr);
    }
  }

  const inlineJobId = `inline_${campaignId}_${Date.now()}`;
  after(async () => {
    try {
      await dispatchCampaignInline(campaignId, {
        appUrl,
        maxDurationMs: 50000,
      });
    } catch (err) {
      console.error(`[CampaignDispatch] Inline serverless dispatch failed for ${campaignId}:`, err);
    }
  });

  return {
    mode: 'serverless_inline',
    jobId: inlineJobId,
  };
}


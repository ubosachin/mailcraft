import { Job } from 'bullmq';
import {
  connectToDatabase,
  Campaign,
  Brand,
  EmailConnection,
  reserveConnectionDailyQuota,
} from '@mailcraft/database';
import {
  createProviderFromConnection,
  IEmailProvider,
} from '@mailcraft/email-providers';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';

export interface TestEmailJobPayload {
  campaignId: string;
  testEmail: string;
}

export async function processTestEmailJob(job: Job<TestEmailJobPayload>): Promise<{ success: boolean; messageId: string }> {
  const { campaignId, testEmail } = job.data;
  console.log(`[Worker] Dispatching test email for campaign ${campaignId} to ${testEmail}`);

  await connectToDatabase();

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const brand = await Brand.findById(campaign.brandId);
  if (!brand) {
    throw new Error(`Brand ${campaign.brandId} not found`);
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
      'No connected email sending provider found. Connect Gmail, Gmail App Password, Brevo, or Amazon SES to send a test email.'
    );
  }

  const quota = await reserveConnectionDailyQuota(connection._id);
  if (!quota.allowed) {
    throw new Error(
      `Daily sending limit of ${quota.limit?.toLocaleString() || '1,500'} emails/day reached for this account.`
    );
  }

  const provider: IEmailProvider = createProviderFromConnection(connection);

  await provider.connect();

  const editorSchema = (campaign.editorData as unknown as IEditorSchema) || {
    settings: {
      background: '#FFFFFF',
      contentWidth: 600,
      fontFamily: 'sans-serif',
    },
    blocks: [],
  };

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
      unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/test_preview',
    },
  });

  const sendResult = await provider.sendEmail({
    to: testEmail,
    from: brand.senderEmail,
    fromName: `[TEST] ${brand.senderName}`,
    subject: `[TEST PREVIEW] ${campaign.subject}`,
    html: compiled.html,
    text: compiled.text,
  });

  await provider.disconnect();

  console.log(`[Worker] Test email sent successfully to ${testEmail}! MsgId: ${sendResult.messageId}`);
  return { success: true, messageId: sendResult.messageId };
}


import { NextRequest } from 'next/server';
import { sendTestEmailSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limiter';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { dispatchTestEmailForCampaign } from '@/lib/campaign-dispatcher';
import { getAppUrl } from '@/lib/url';

export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const rateLimit = await checkRateLimit(`test_email:${session._id}`, 'TEST_EMAIL');
    if (!rateLimit.success) {
      return jsonError('Test email dispatch limit exceeded. Please wait a few minutes.', 429, {
        retryAfter: Math.ceil(rateLimit.resetMs / 1000),
      });
    }

    const { id } = await params;
    const body = await request.json();
    const { testEmail } = sendTestEmailSchema.parse(body);

    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const result = await dispatchTestEmailForCampaign(
      campaign._id.toString(),
      testEmail,
      getAppUrl(request)
    );

    return jsonSuccess({
      jobId: result.messageId,
      messageId: result.messageId,
      provider: result.provider,
      senderEmail: result.senderEmail,
      testEmail,
      message: `Test email sent successfully to ${testEmail} via ${result.provider.toUpperCase()}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

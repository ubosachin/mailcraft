import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { triggerCampaignDispatch } from '@/lib/campaign-dispatcher';
import { getAppUrl } from '@/lib/url';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) return jsonError('Authentication required', 401);

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) return jsonError('Campaign not found', 404);

    if (campaign.status !== 'paused') {
      return jsonError(`Campaign is not paused (current status: '${campaign.status}')`, 400);
    }

    campaign.status = 'queued';
    await campaign.save();

    const dispatch = await triggerCampaignDispatch(campaign._id.toString(), getAppUrl(request));

    return jsonSuccess(
      { status: 'queued', jobId: dispatch.jobId, dispatchMode: dispatch.mode },
      200,
      'Campaign delivery resumed'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

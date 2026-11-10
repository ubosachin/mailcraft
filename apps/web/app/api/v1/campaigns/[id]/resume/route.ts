import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { enqueueCampaignJob } from '@/lib/queue';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
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

    await enqueueCampaignJob(campaign._id.toString());

    return jsonSuccess({ status: 'queued' }, 200, 'Campaign delivery resumed');
  } catch (error) {
    return handleApiError(error);
  }
}


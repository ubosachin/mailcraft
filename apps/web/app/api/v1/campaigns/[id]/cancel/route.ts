import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, CampaignRecipient } from '@mailcraft/database';
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

    if (campaign.status === 'completed') {
      return jsonError('Cannot cancel an already completed campaign', 400);
    }

    campaign.status = 'cancelled';
    campaign.cancelledAt = new Date();
    await campaign.save();

    // Mark remaining pending/queued recipients as cancelled
    await CampaignRecipient.updateMany(
      { campaignId: campaign._id, status: { $in: ['pending', 'queued', 'processing'] } },
      { $set: { status: 'cancelled' } }
    );

    return jsonSuccess({ status: 'cancelled', campaignId: id }, 200, 'Campaign cancelled');
  } catch (error) {
    return handleApiError(error);
  }
}

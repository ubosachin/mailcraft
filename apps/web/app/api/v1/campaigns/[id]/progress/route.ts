import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, CampaignRecipient } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const counts = await CampaignRecipient.aggregate([
      { $match: { campaignId: campaign._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts: Record<string, number> = {
      pending: 0,
      queued: 0,
      processing: 0,
      accepted: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
      skipped: 0,
      cancelled: 0,
      unsubscribed: 0,
    };

    for (const item of counts) {
      statusCounts[item._id] = item.count;
    }

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completedOrResolved =
      statusCounts.delivered +
      statusCounts.bounced +
      statusCounts.failed +
      statusCounts.skipped +
      statusCounts.cancelled +
      statusCounts.unsubscribed;

    const percentage = total > 0 ? Math.min(100, Math.round((completedOrResolved / total) * 100)) : 0;

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      campaignName: campaign.campaignName,
      status: campaign.status,
      total,
      queued: statusCounts.pending + statusCounts.queued,
      processing: statusCounts.processing,
      delivered: statusCounts.delivered + statusCounts.accepted,
      bounced: statusCounts.bounced,
      failed: statusCounts.failed,
      skipped: statusCounts.skipped,
      cancelled: statusCounts.cancelled,
      unsubscribed: statusCounts.unsubscribed,
      percentage,
      startedAt: campaign.startedAt ? campaign.startedAt.toISOString() : null,
      completedAt: campaign.completedAt ? campaign.completedAt.toISOString() : null,
      stats: campaign.stats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


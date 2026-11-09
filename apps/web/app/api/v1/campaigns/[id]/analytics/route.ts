import { NextRequest } from 'next/server';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  CampaignEvent,
} from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const [recipients, events] = await Promise.all([
      CampaignRecipient.find({ campaignId: campaign._id })
        .sort({ createdAt: -1 })
        .limit(100),
      CampaignEvent.find({ campaignId: campaign._id })
        .sort({ occurredAt: -1 })
        .limit(50),
    ]);

    const total = campaign.recipientCount || recipients.length || 0;
    const delivered = campaign.stats.delivered;
    const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0.0';
    const bounceRate = total > 0 ? ((campaign.stats.bounced / total) * 100).toFixed(1) : '0.0';

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      campaignName: campaign.campaignName,
      status: campaign.status,
      startedAt: campaign.startedAt?.toISOString(),
      completedAt: campaign.completedAt?.toISOString(),
      totalRecipients: total,
      metrics: {
        accepted: campaign.stats.accepted,
        delivered: campaign.stats.delivered,
        bounced: campaign.stats.bounced,
        clicked: campaign.stats.clicked,
        unsubscribed: campaign.stats.unsubscribed,
        failed: campaign.stats.failed,
        deliveryRatePercent: Number(deliveryRate),
        bounceRatePercent: Number(bounceRate),
      },
      recipients: recipients.map((r) => ({
        id: r._id.toString(),
        email: r.email,
        status: r.status,
        providerMessageId: r.providerMessageId,
        sentAt: r.sentAt?.toISOString(),
        deliveredAt: r.deliveredAt?.toISOString(),
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
      })),
      recentEvents: events.map((e) => ({
        id: e._id.toString(),
        eventType: e.eventType,
        metadata: e.metadata,
        occurredAt: e.occurredAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}


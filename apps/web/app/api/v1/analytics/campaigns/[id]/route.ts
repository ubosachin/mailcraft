import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent, TrackingToken } from '@mailcraft/database';
import { ICampaignAnalyticsDetail, IAnalyticsTimelinePoint, IAnalyticsLinkPerformance } from '@mailcraft/shared-types';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id }).lean();
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    // Get all events for this campaign
    const events = await EmailEvent.find({
      sessionId: session._id,
      campaignId: campaign._id,
    }).lean();

    let providerAccepted = 0;
    let confirmedDeliveries = 0;
    let hardBounces = 0;
    let softBounces = 0;
    let complaints = 0;
    let totalClicks = 0;
    let totalOpens = 0;
    let unsubscribes = 0;
    let failedSends = 0;

    const uniqueClickerRecipients = new Set<string>();
    const uniqueOpenRecipients = new Set<string>();

    for (const evt of events) {
      const recKey = evt.campaignRecipientId
        ? evt.campaignRecipientId.toString()
        : (evt.metadata?.recipientEmail as string) || (evt.metadata?.tokenHash as string) || evt.eventId;

      switch (evt.eventType) {
        case 'provider_accepted':
          providerAccepted++;
          break;
        case 'delivered':
          confirmedDeliveries++;
          break;
        case 'hard_bounce':
          hardBounces++;
          break;
        case 'soft_bounce':
          softBounces++;
          break;
        case 'complaint':
          complaints++;
          break;
        case 'opened':
          totalOpens++;
          uniqueOpenRecipients.add(recKey);
          break;
        case 'clicked':
          totalClicks++;
          uniqueClickerRecipients.add(recKey);
          break;
        case 'unsubscribed':
          unsubscribes++;
          break;
        case 'failed':
        case 'rejected':
          failedSends++;
          break;
        default:
          break;
      }
    }

    // Attempted calculation
    let totalAttempted = 0;
    if (campaign.stats) {
      totalAttempted = (campaign.stats.accepted || 0) + (campaign.stats.failed || 0);
    }
    if (totalAttempted === 0 && campaign.recipientCount) {
      totalAttempted = campaign.recipientCount;
    }
    if (totalAttempted === 0) {
      totalAttempted = providerAccepted + confirmedDeliveries + hardBounces + softBounces + failedSends;
    }

    const totalBounces = hardBounces + softBounces;
    const uniqueClickers = uniqueClickerRecipients.size;
    const uniqueOpens = uniqueOpenRecipients.size;

    // Rates with null zero-denominator safety
    const acceptanceRate = totalAttempted > 0 ? Number(((providerAccepted / totalAttempted) * 100).toFixed(2)) : null;
    const deliveryRate = totalAttempted > 0 ? Number(((confirmedDeliveries / totalAttempted) * 100).toFixed(2)) : null;
    const bounceRate = totalAttempted > 0 ? Number(((totalBounces / totalAttempted) * 100).toFixed(2)) : null;

    const successfulDeliveries = confirmedDeliveries > 0 ? confirmedDeliveries : providerAccepted;
    const complaintRate = successfulDeliveries > 0 ? Number(((complaints / successfulDeliveries) * 100).toFixed(2)) : null;
    const clickThroughRate = successfulDeliveries > 0 ? Number(((uniqueClickers / successfulDeliveries) * 100).toFixed(2)) : null;
    const unsubscribeRate = successfulDeliveries > 0 ? Number(((unsubscribes / successfulDeliveries) * 100).toFixed(2)) : null;

    // Timeline points (grouped by hourly or daily format)
    const timelineMap = new Map<string, { deliveries: number; bounces: number; clicks: number; opens: number }>();
    for (const evt of events) {
      const dateStr = new Date(evt.eventTimestamp).toISOString().substring(0, 13) + ':00'; // Hourly resolution
      let point = timelineMap.get(dateStr);
      if (!point) {
        point = { deliveries: 0, bounces: 0, clicks: 0, opens: 0 };
        timelineMap.set(dateStr, point);
      }
      if (evt.eventType === 'delivered' || evt.eventType === 'provider_accepted') {
        point.deliveries++;
      } else if (evt.eventType === 'hard_bounce' || evt.eventType === 'soft_bounce') {
        point.bounces++;
      } else if (evt.eventType === 'clicked') {
        point.clicks++;
      } else if (evt.eventType === 'opened') {
        point.opens++;
      }
    }

    const timeline: IAnalyticsTimelinePoint[] = Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, data]) => ({
        timestamp,
        ...data,
      }));

    // Link performance breakdown
    // Look up tracking tokens created for this campaign
    const clickEvents = events.filter((e) => e.eventType === 'clicked');
    const linkMap = new Map<string, { url: string; clickCount: number; clickerSet: Set<string> }>();

    for (const ce of clickEvents) {
      const destUrl = (ce.metadata?.destinationUrl as string) || 'Unknown URL';
      const recKey = ce.campaignRecipientId
        ? ce.campaignRecipientId.toString()
        : (ce.metadata?.recipientEmail as string) || (ce.metadata?.tokenHash as string) || ce.eventId;

      if (!linkMap.has(destUrl)) {
        linkMap.set(destUrl, { url: destUrl, clickCount: 0, clickerSet: new Set() });
      }
      const item = linkMap.get(destUrl)!;
      item.clickCount++;
      item.clickerSet.add(recKey);
    }

    // Also include any tracking tokens registered for this campaign even if 0 clicks
    const registeredTokens = await TrackingToken.find({
      campaignId: campaign._id,
      type: 'click',
    }).lean();

    for (const tok of registeredTokens) {
      if (tok.destinationUrl && !linkMap.has(tok.destinationUrl)) {
        linkMap.set(tok.destinationUrl, {
          url: tok.destinationUrl,
          clickCount: tok.clickCount || 0,
          clickerSet: new Set(),
        });
      }
    }

    const links: IAnalyticsLinkPerformance[] = Array.from(linkMap.values()).map((l) => ({
      url: l.url,
      clickCount: l.clickCount,
      uniqueClickers: l.clickerSet.size,
    }));

    const detail: ICampaignAnalyticsDetail = {
      campaignId: campaign._id.toString(),
      campaignName: campaign.campaignName,
      subject: campaign.subject,
      provider: campaign.provider || 'unknown',
      senderName: campaign.senderName || 'MailCraft Sender',
      senderEmail: campaign.senderEmail || '',
      sentDate: campaign.startedAt?.toISOString() || campaign.createdAt.toISOString(),
      status: campaign.status,
      targetRecipients: campaign.recipientCount || 0,
      totalCampaigns: 1,
      totalAttempted,
      providerAccepted,
      confirmedDeliveries,
      hardBounces,
      softBounces,
      totalBounces,
      complaints,
      totalClicks,
      uniqueClickers,
      uniqueOpens,
      totalOpens,
      unsubscribes,
      failedSends,
      acceptanceRate,
      deliveryRate,
      bounceRate,
      complaintRate,
      clickThroughRate,
      unsubscribeRate,
      links,
      timeline,
    };

    return jsonSuccess({ analytics: detail });
  } catch (error) {
    return handleApiError(error);
  }
}

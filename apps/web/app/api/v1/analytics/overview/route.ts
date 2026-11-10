import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent, CampaignRecipient } from '@mailcraft/database';
import { IAnalyticsOverview, IAnalyticsTimelinePoint } from '@mailcraft/shared-types';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { searchParams } = request.nextUrl;
    const campaignId = searchParams.get('campaignId');
    const provider = searchParams.get('provider');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    await connectToDatabase();

    // Find all matching campaigns for this session
    const campaignFilter: Record<string, unknown> = { sessionId: session._id };
    if (campaignId) {
      campaignFilter._id = campaignId;
    }
    if (provider) {
      campaignFilter.provider = provider;
    }

    const campaigns = await Campaign.find(campaignFilter).lean();
    const campaignIds = campaigns.map((c) => c._id);

    if (campaignIds.length === 0) {
      const emptyOverview: IAnalyticsOverview = {
        totalCampaigns: 0,
        totalAttempted: 0,
        providerAccepted: 0,
        confirmedDeliveries: 0,
        hardBounces: 0,
        softBounces: 0,
        totalBounces: 0,
        complaints: 0,
        totalClicks: 0,
        uniqueClickers: 0,
        uniqueOpens: 0,
        totalOpens: 0,
        unsubscribes: 0,
        failedSends: 0,
        acceptanceRate: null,
        deliveryRate: null,
        bounceRate: null,
        complaintRate: null,
        clickThroughRate: null,
        unsubscribeRate: null,
      };

      return jsonSuccess({
        overview: emptyOverview,
        timeline: [],
        providers: [],
      });
    }

    // Match criteria for EmailEvents
    const eventMatch: Record<string, unknown> = {
      sessionId: session._id,
      campaignId: { $in: campaignIds },
    };

    if (startDateParam || endDateParam) {
      const dateQuery: Record<string, Date> = {};
      if (startDateParam) {
        const s = new Date(startDateParam);
        if (!isNaN(s.getTime())) dateQuery.$gte = s;
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        if (!isNaN(e.getTime())) dateQuery.$lte = e;
      }
      if (Object.keys(dateQuery).length > 0) {
        eventMatch.eventTimestamp = dateQuery;
      }
    }

    // Aggregate counts of event types
    const events = await EmailEvent.find(eventMatch).lean();

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

    // Count attempted from campaigns or recipient docs
    let totalAttempted = 0;
    for (const c of campaigns) {
      if (c.stats) {
        totalAttempted += (c.stats.accepted || 0) + (c.stats.failed || 0);
      } else if (c.recipientCount && c.status !== 'draft') {
        totalAttempted += c.recipientCount;
      }
    }
    // Fallback if campaigns stats is 0 but we have provider events
    if (totalAttempted === 0) {
      totalAttempted = providerAccepted + confirmedDeliveries + hardBounces + softBounces + failedSends;
    }

    const totalBounces = hardBounces + softBounces;
    const uniqueClickers = uniqueClickerRecipients.size;
    const uniqueOpens = uniqueOpenRecipients.size;

    // Formulas with zero denominator safety: null when denominator is 0
    const acceptanceRate = totalAttempted > 0 ? Number(((providerAccepted / totalAttempted) * 100).toFixed(2)) : null;
    const deliveryRate = totalAttempted > 0 ? Number(((confirmedDeliveries / totalAttempted) * 100).toFixed(2)) : null;
    const bounceRate = totalAttempted > 0 ? Number(((totalBounces / totalAttempted) * 100).toFixed(2)) : null;

    // Engagement rates denominator is confirmedDeliveries, or if no delivery webhooks, providerAccepted
    const successfulDeliveries = confirmedDeliveries > 0 ? confirmedDeliveries : providerAccepted;
    const complaintRate = successfulDeliveries > 0 ? Number(((complaints / successfulDeliveries) * 100).toFixed(2)) : null;
    const clickThroughRate = successfulDeliveries > 0 ? Number(((uniqueClickers / successfulDeliveries) * 100).toFixed(2)) : null;
    const unsubscribeRate = successfulDeliveries > 0 ? Number(((unsubscribes / successfulDeliveries) * 100).toFixed(2)) : null;

    const overview: IAnalyticsOverview = {
      totalCampaigns: campaigns.length,
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
    };

    // Build timeline points (grouped by YYYY-MM-DD)
    const timelineMap = new Map<string, { deliveries: number; bounces: number; clicks: number; opens: number }>();
    for (const evt of events) {
      const dateStr = new Date(evt.eventTimestamp).toISOString().split('T')[0];
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

    // Provider breakdown
    const providerMap = new Map<string, { provider: string; attempted: number; delivered: number; bounces: number; complaints: number; clicks: number }>();
    for (const c of campaigns) {
      const p = c.provider || 'unknown';
      if (!providerMap.has(p)) {
        providerMap.set(p, { provider: p, attempted: 0, delivered: 0, bounces: 0, complaints: 0, clicks: 0 });
      }
      const entry = providerMap.get(p)!;
      if (c.stats) {
        entry.attempted += (c.stats.accepted || 0) + (c.stats.failed || 0);
        entry.delivered += c.stats.delivered || 0;
        entry.bounces += c.stats.bounced || 0;
      }
    }

    for (const evt of events) {
      const p = evt.provider || 'unknown';
      if (providerMap.has(p)) {
        const entry = providerMap.get(p)!;
        if (evt.eventType === 'complaint') entry.complaints++;
        if (evt.eventType === 'clicked') entry.clicks++;
      }
    }

    return jsonSuccess({
      overview,
      timeline,
      providers: Array.from(providerMap.values()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

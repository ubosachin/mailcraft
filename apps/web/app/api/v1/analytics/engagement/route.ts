import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent, TrackingToken } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    await connectToDatabase();

    const campaigns = await Campaign.find({ sessionId: session._id }).lean();
    const campaignIds = campaigns.map((c) => c._id);

    const events = await EmailEvent.find({
      sessionId: session._id,
      campaignId: { $in: campaignIds },
      eventType: { $in: ['opened', 'clicked', 'delivered', 'provider_accepted'] },
    }).lean();

    let totalOpens = 0;
    let totalClicks = 0;
    let botClicks = 0;
    let humanClicks = 0;
    let confirmedDeliveries = 0;
    let providerAccepted = 0;

    const uniqueOpenRecipients = new Set<string>();
    const uniqueClickerRecipients = new Set<string>();
    const hourlyDistribution = new Array(24).fill(0);
    const linkMap = new Map<string, { url: string; clicks: number; uniqueRecipients: Set<string>; botCount: number }>();

    for (const evt of events) {
      const recKey = evt.campaignRecipientId
        ? evt.campaignRecipientId.toString()
        : (evt.metadata?.recipientEmail as string) || (evt.metadata?.tokenHash as string) || evt.eventId;

      if (evt.eventType === 'delivered') confirmedDeliveries++;
      if (evt.eventType === 'provider_accepted') providerAccepted++;

      if (evt.eventType === 'opened') {
        totalOpens++;
        uniqueOpenRecipients.add(recKey);
      } else if (evt.eventType === 'clicked') {
        totalClicks++;
        const isBot = Boolean(evt.metadata?.isBot);
        if (isBot) {
          botClicks++;
        } else {
          humanClicks++;
        }

        uniqueClickerRecipients.add(recKey);

        const hour = new Date(evt.eventTimestamp).getUTCHours();
        hourlyDistribution[hour]++;

        const destUrl = (evt.metadata?.destinationUrl as string) || 'General Link';
        if (!linkMap.has(destUrl)) {
          linkMap.set(destUrl, { url: destUrl, clicks: 0, uniqueRecipients: new Set(), botCount: 0 });
        }
        const item = linkMap.get(destUrl)!;
        item.clicks++;
        item.uniqueRecipients.add(recKey);
        if (isBot) item.botCount++;
      }
    }

    const uniqueOpens = uniqueOpenRecipients.size;
    const uniqueClickers = uniqueClickerRecipients.size;
    const successfulDeliveries = confirmedDeliveries > 0 ? confirmedDeliveries : providerAccepted;

    const clickThroughRate = successfulDeliveries > 0 ? Number(((uniqueClickers / successfulDeliveries) * 100).toFixed(2)) : null;
    const clickToOpenRate = uniqueOpens > 0 ? Number(((uniqueClickers / uniqueOpens) * 100).toFixed(2)) : null;
    const openRate = successfulDeliveries > 0 ? Number(((uniqueOpens / successfulDeliveries) * 100).toFixed(2)) : null;

    const linkRankings = Array.from(linkMap.values())
      .map((l) => ({
        url: l.url,
        clicks: l.clicks,
        uniqueClickers: l.uniqueRecipients.size,
        botClicks: l.botCount,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return jsonSuccess({
      metrics: {
        totalOpens,
        uniqueOpens,
        totalClicks,
        uniqueClickers,
        humanClicks,
        botClicks,
        openRate,
        clickThroughRate,
        clickToOpenRate,
      },
      linkRankings,
      hourlyDistribution: hourlyDistribution.map((clicks, hour) => ({
        hour: `${String(hour).padStart(2, '0')}:00 UTC`,
        clicks,
      })),
      botAnalysis: {
        totalBotClicks: botClicks,
        botPercentage: totalClicks > 0 ? Number(((botClicks / totalClicks) * 100).toFixed(1)) : 0,
        explanation: 'Bot clicks represent automated anti-virus, mailbox security scanners, or pre-fetch engines inspecting links prior to recipient delivery.',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

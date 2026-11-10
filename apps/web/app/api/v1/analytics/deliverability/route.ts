import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent, CampaignRecipient } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();

    const campaigns = await Campaign.find({ sessionId: session._id }).lean();
    const campaignIds = campaigns.map((c) => c._id);

    const events = await EmailEvent.find({
      sessionId: session._id,
      campaignId: { $in: campaignIds },
    }).lean();

    let providerAccepted = 0;
    let confirmedDeliveries = 0;
    let hardBounces = 0;
    let softBounces = 0;
    let complaints = 0;

    const softBounceReasons: Record<string, number> = {};
    const hardBounceReasons: Record<string, number> = {};
    const domainBreakdown: Record<string, { attempted: number; delivered: number; bounces: number; complaints: number }> = {};

    for (const evt of events) {
      const email = (evt.metadata?.recipientEmail as string) || (evt.metadata?.email as string) || '';
      const domain = email.includes('@') ? email.split('@')[1].toLowerCase() : 'other';

      if (!domainBreakdown[domain]) {
        domainBreakdown[domain] = { attempted: 0, delivered: 0, bounces: 0, complaints: 0 };
      }

      switch (evt.eventType) {
        case 'provider_accepted':
          providerAccepted++;
          domainBreakdown[domain].attempted++;
          break;
        case 'delivered':
          confirmedDeliveries++;
          domainBreakdown[domain].delivered++;
          break;
        case 'hard_bounce':
          hardBounces++;
          domainBreakdown[domain].bounces++;
          {
            const reason = (evt.metadata?.reason as string) || (evt.metadata?.diagnosticCode as string) || 'Mailbox does not exist';
            hardBounceReasons[reason] = (hardBounceReasons[reason] || 0) + 1;
          }
          break;
        case 'soft_bounce':
          softBounces++;
          domainBreakdown[domain].bounces++;
          {
            const reason = (evt.metadata?.reason as string) || (evt.metadata?.diagnosticCode as string) || 'Mailbox full or temporary issue';
            softBounceReasons[reason] = (softBounceReasons[reason] || 0) + 1;
          }
          break;
        case 'complaint':
          complaints++;
          domainBreakdown[domain].complaints++;
          break;
        default:
          break;
      }
    }

    let totalAttempted = 0;
    for (const c of campaigns) {
      if (c.stats) {
        totalAttempted += (c.stats.accepted || 0) + (c.stats.failed || 0);
      } else if (c.recipientCount && c.status !== 'draft') {
        totalAttempted += c.recipientCount;
      }
    }
    if (totalAttempted === 0) {
      totalAttempted = providerAccepted + confirmedDeliveries + hardBounces + softBounces;
    }

    const totalBounces = hardBounces + softBounces;
    const successfulDeliveries = confirmedDeliveries > 0 ? confirmedDeliveries : providerAccepted;

    const deliveryRate = totalAttempted > 0 ? Number(((confirmedDeliveries / totalAttempted) * 100).toFixed(2)) : null;
    const bounceRate = totalAttempted > 0 ? Number(((totalBounces / totalAttempted) * 100).toFixed(2)) : null;
    const hardBounceRate = totalAttempted > 0 ? Number(((hardBounces / totalAttempted) * 100).toFixed(2)) : null;
    const softBounceRate = totalAttempted > 0 ? Number(((softBounces / totalAttempted) * 100).toFixed(2)) : null;
    const complaintRate = successfulDeliveries > 0 ? Number(((complaints / successfulDeliveries) * 100).toFixed(3)) : null;

    // Reputation Status evaluation
    let reputationStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    const warnings: string[] = [];

    if (complaintRate !== null && complaintRate > 0.1) {
      reputationStatus = 'critical';
      warnings.push('Complaint rate exceeds 0.10% threshold. Mailbox providers (Gmail, Yahoo) may throttle or reject incoming traffic.');
    } else if (complaintRate !== null && complaintRate > 0.05) {
      reputationStatus = 'warning';
      warnings.push('Complaint rate elevated above 0.05%. Monitor list opt-in freshness.');
    }

    if (bounceRate !== null && bounceRate > 5.0) {
      reputationStatus = 'critical';
      warnings.push('Bounce rate exceeds 5.0%. Review contact import sources and remove unverified email addresses.');
    } else if (bounceRate !== null && bounceRate > 2.0) {
      if ((reputationStatus as string) !== 'critical') {
        reputationStatus = 'warning';
      }
      warnings.push('Bounce rate elevated above 2.0%. Clean inactive recipients.');
    }

    return jsonSuccess({
      metrics: {
        totalAttempted,
        providerAccepted,
        confirmedDeliveries,
        hardBounces,
        softBounces,
        totalBounces,
        complaints,
        deliveryRate,
        bounceRate,
        hardBounceRate,
        softBounceRate,
        complaintRate,
      },
      health: {
        reputationStatus,
        warnings,
      },
      bounces: {
        softReasons: Object.entries(softBounceReasons).map(([reason, count]) => ({ reason, count })),
        hardReasons: Object.entries(hardBounceReasons).map(([reason, count]) => ({ reason, count })),
      },
      domains: Object.entries(domainBreakdown)
        .filter(([_, d]) => d.attempted > 0 || d.bounces > 0 || d.delivered > 0)
        .map(([domain, stats]) => ({
          domain,
          attempted: stats.attempted,
          delivered: stats.delivered,
          bounces: stats.bounces,
          complaints: stats.complaints,
        })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

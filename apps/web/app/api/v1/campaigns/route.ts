import { NextRequest } from 'next/server';
import { createCampaignSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign, Brand, EmailConnection } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limiter';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const rateLimit = await checkRateLimit(`camp_create:${session._id}`, 'CAMPAIGN_CREATE');
    if (!rateLimit.success) {
      return jsonError('Campaign creation limit reached for this session. Please try again later.', 429, {
        retryAfter: Math.ceil(rateLimit.resetMs / 1000),
      });
    }

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    await connectToDatabase();

    const brand = await Brand.findOne({
      _id: validated.brandId,
      sessionId: session._id,
    });
    if (!brand) {
      return jsonError('Brand not found or does not belong to session', 404);
    }

    let providerName = 'mock';
    if (validated.connectionId) {
      const conn = await EmailConnection.findOne({
        _id: validated.connectionId,
        sessionId: session._id,
      });
      if (conn) {
        providerName = conn.provider;
      }
    }

    const campaign = await Campaign.create({
      sessionId: session._id,
      brandId: brand._id,
      connectionId: validated.connectionId || null,
      campaignName: validated.campaignName,
      description: validated.description || '',
      subject: validated.subject,
      preheader: validated.preheader || '',
      senderName: brand.senderName,
      senderEmail: brand.senderEmail,
      provider: providerName,
      templateId: validated.templateId || null,
      editorData: validated.editorData || {},
      audienceType: validated.audienceType || 'all_eligible',
      audienceFilters: validated.audienceFilters || {},
      status: 'draft',
      stats: {
        accepted: 0,
        delivered: 0,
        bounced: 0,
        clicked: 0,
        unsubscribed: 0,
        failed: 0,
      },
    });

    return jsonSuccess(
      {
        id: campaign._id.toString(),
        campaignName: campaign.campaignName,
        subject: campaign.subject,
        status: campaign.status,
        provider: campaign.provider,
        recipientCount: campaign.recipientCount,
        createdAt: campaign.createdAt.toISOString(),
      },
      201,
      'Campaign created'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const provider = searchParams.get('provider')?.trim() || '';
    const brandId = searchParams.get('brandId')?.trim() || '';

    await connectToDatabase();

    const query: Record<string, unknown> = { sessionId: session._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (provider && provider !== 'all') {
      query.provider = provider;
    }
    if (brandId && brandId !== 'all') {
      query.brandId = brandId;
    }
    if (search) {
      query.$or = [
        { campaignName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [campaigns, totalFiltered, countsByStatus] = await Promise.all([
      Campaign.find(query)
        .populate('brandId', 'brandName senderEmail primaryColor logoUrl')
        .populate('connectionId', 'provider senderEmail status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(query),
      Campaign.aggregate([
        { $match: { sessionId: session._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = new Map<string, number>();
    for (const item of countsByStatus) {
      statusMap.set(item._id, item.count);
    }

    const stats = {
      totalCampaigns: Array.from(statusMap.values()).reduce((a, b) => a + b, 0),
      completedCampaigns: statusMap.get('completed') || 0,
      currentlySending: (statusMap.get('sending') || 0) + (statusMap.get('queued') || 0),
      draftCampaigns: statusMap.get('draft') || 0,
      failedCampaigns: (statusMap.get('failed') || 0) + (statusMap.get('partially_completed') || 0),
      scheduledCampaigns: statusMap.get('scheduled') || 0,
      pausedCampaigns: statusMap.get('paused') || 0,
    };

    return jsonSuccess({
      campaigns: campaigns.map((c: any) => ({
        id: c._id.toString(),
        campaignName: c.campaignName,
        description: c.description,
        subject: c.subject,
        preheader: c.preheader,
        status: c.status,
        provider: c.provider || c.connectionId?.provider || 'mock',
        recipientCount: c.recipientCount || 0,
        eligibleRecipientCount: c.eligibleRecipientCount || 0,
        stats: c.stats || { accepted: 0, delivered: 0, bounced: 0, clicked: 0, unsubscribed: 0, failed: 0 },
        brand: c.brandId
          ? {
              id: c.brandId._id?.toString(),
              name: c.brandId.brandName,
              senderEmail: c.brandId.senderEmail,
              primaryColor: c.brandId.primaryColor,
              logoUrl: c.brandId.logoUrl,
            }
          : null,
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : null,
        startedAt: c.startedAt ? new Date(c.startedAt).toISOString() : null,
        completedAt: c.completedAt ? new Date(c.completedAt).toISOString() : null,
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.updatedAt).toISOString(),
      })),
      stats,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

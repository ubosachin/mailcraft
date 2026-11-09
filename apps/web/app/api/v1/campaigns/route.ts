import { NextRequest } from 'next/server';
import { createCampaignSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign, Brand } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
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

    const campaign = await Campaign.create({
      sessionId: session._id,
      brandId: brand._id,
      campaignName: validated.campaignName,
      subject: validated.subject,
      preheader: validated.preheader || '',
      templateId: validated.templateId || null,
      editorData: validated.editorData || {},
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
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    await connectToDatabase();
    const campaigns = await Campaign.find({ sessionId: session._id })
      .populate('brandId', 'brandName senderEmail primaryColor')
      .sort({ createdAt: -1 });

    return jsonSuccess(
      campaigns.map((c) => ({
        id: c._id.toString(),
        campaignName: c.campaignName,
        subject: c.subject,
        status: c.status,
        recipientCount: c.recipientCount,
        stats: c.stats,
        scheduledAt: c.scheduledAt?.toISOString(),
        startedAt: c.startedAt?.toISOString(),
        completedAt: c.completedAt?.toISOString(),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}


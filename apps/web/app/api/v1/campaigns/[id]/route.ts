import { NextRequest } from 'next/server';
import { updateCampaignSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign, Brand } from '@mailcraft/database';
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

    const campaign = await Campaign.findOne({
      _id: id,
      sessionId: session._id,
    }).populate('brandId');

    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    return jsonSuccess({
      id: campaign._id.toString(),
      campaignName: campaign.campaignName,
      subject: campaign.subject,
      preheader: campaign.preheader,
      templateId: campaign.templateId?.toString(),
      connectionId: campaign.connectionId?.toString(),
      editorData: campaign.editorData,
      status: campaign.status,
      recipientCount: campaign.recipientCount,
      stats: campaign.stats,
      brand: campaign.brandId,
      createdAt: campaign.createdAt.toISOString(),
      startedAt: campaign.startedAt?.toISOString(),
      completedAt: campaign.completedAt?.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateCampaignSchema.parse(body);

    await connectToDatabase();

    const campaign = await Campaign.findOne({
      _id: id,
      sessionId: session._id,
    });

    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return jsonError(`Cannot edit campaign in '${campaign.status}' state`, 400);
    }

    Object.assign(campaign, validated);
    await campaign.save();

    return jsonSuccess(
      {
        id: campaign._id.toString(),
        campaignName: campaign.campaignName,
        subject: campaign.subject,
        status: campaign.status,
      },
      200,
      'Campaign updated'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = PATCH;



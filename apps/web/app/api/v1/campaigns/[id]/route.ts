import { NextRequest } from 'next/server';
import { updateCampaignSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign, CampaignRecipient, CampaignEvent } from '@mailcraft/database';
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

    const campaign = await Campaign.findOne({
      _id: id,
      sessionId: session._id,
    })
      .populate('brandId')
      .populate('connectionId');

    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const rawConnection = campaign.connectionId as unknown as
      | string
      | { _id?: { toString(): string }; toString?: () => string }
      | null;
    const resolvedConnectionId =
      rawConnection && typeof rawConnection === 'object' && '_id' in rawConnection && rawConnection._id
        ? rawConnection._id.toString()
        : typeof rawConnection === 'string'
        ? rawConnection
        : null;

    return jsonSuccess({
      id: campaign._id.toString(),
      campaignName: campaign.campaignName,
      description: campaign.description,
      subject: campaign.subject,
      preheader: campaign.preheader,
      templateId: campaign.templateId?.toString(),
      connectionId: resolvedConnectionId,
      provider: campaign.provider || 'unassigned',
      editorData: campaign.editorData,
      renderedHtml: campaign.renderedHtml,
      renderedText: campaign.renderedText,
      audienceType: campaign.audienceType || 'all_eligible',
      audienceFilters: campaign.audienceFilters || {},
      status: campaign.status,
      recipientCount: campaign.recipientCount,
      eligibleRecipientCount: campaign.eligibleRecipientCount,
      stats: campaign.stats,
      brand: campaign.brandId,
      connection: campaign.connectionId,
      snapshot: campaign.snapshot,
      scheduledAt: campaign.scheduledAt?.toISOString(),
      startedAt: campaign.startedAt?.toISOString(),
      completedAt: campaign.completedAt?.toISOString(),
      pausedAt: campaign.pausedAt?.toISOString(),
      cancelledAt: campaign.cancelledAt?.toISOString(),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
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
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
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

export async function DELETE(
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

    const campaign = await Campaign.findOne({
      _id: id,
      sessionId: session._id,
    });

    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    if (campaign.status === 'sending' || campaign.status === 'queued') {
      return jsonError(`Cannot delete a campaign that is currently '${campaign.status}'. Please cancel it first.`, 400);
    }

    // Clean up associated recipients and events
    await Promise.all([
      CampaignRecipient.deleteMany({ campaignId: campaign._id }),
      CampaignEvent.deleteMany({ campaignId: campaign._id }),
      Campaign.deleteOne({ _id: campaign._id }),
    ]);

    return jsonSuccess({ id }, 200, 'Campaign deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = PATCH;

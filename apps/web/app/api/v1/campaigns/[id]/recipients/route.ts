import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, CampaignRecipient } from '@mailcraft/database';
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
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const status = searchParams.get('status')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';

    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const query: Record<string, unknown> = { campaignId: campaign._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [recipients, totalFiltered] = await Promise.all([
      CampaignRecipient.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CampaignRecipient.countDocuments(query),
    ]);

    return jsonSuccess({
      recipients: recipients.map((r) => ({
        id: r._id.toString(),
        email: r.email,
        status: r.status,
        provider: r.provider,
        providerMessageId: r.providerMessageId,
        attempts: r.attempts,
        errorCode: r.errorCode || r.lastErrorCode,
        errorMessage: r.errorMessage || r.lastErrorMessage,
        personalizationData: r.personalizationData,
        sentAt: r.sentAt?.toISOString(),
        deliveredAt: r.deliveredAt?.toISOString(),
        queuedAt: r.queuedAt?.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
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


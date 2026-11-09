import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) return jsonError('Guest session required', 401);

    const { id } = await params;
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) return jsonError('Campaign not found', 404);

    campaign.status = 'cancelled';
    await campaign.save();

    return jsonSuccess({ status: 'cancelled' }, 200, 'Campaign cancelled');
  } catch (error) {
    return handleApiError(error);
  }
}


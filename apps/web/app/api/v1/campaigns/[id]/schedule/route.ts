import { NextRequest } from 'next/server';
import { scheduleCampaignSchema } from '@mailcraft/validation';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { enqueueCampaignJob } from '@/lib/queue';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const validated = scheduleCampaignSchema.parse(body);

    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return jsonError(`Cannot schedule campaign in '${campaign.status}' state`, 400);
    }

    const scheduledDate = new Date(validated.scheduledAt);
    const now = Date.now();
    const delayMs = scheduledDate.getTime() - now;

    if (delayMs < 0) {
      return jsonError('Scheduled time must be in the future', 400);
    }

    campaign.status = 'scheduled';
    campaign.scheduledAt = scheduledDate;
    await campaign.save();

    // Enqueue delayed BullMQ job
    const job = await enqueueCampaignJob(campaign._id.toString(), {
      delayMs,
      jobId: `sched_${campaign._id}_${scheduledDate.getTime()}`,
    });

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      jobId: job.id,
      status: 'scheduled',
      scheduledAt: scheduledDate.toISOString(),
      timezone: validated.timezone,
      delayMs,
      message: `Campaign scheduled for delivery on ${scheduledDate.toISOString()}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

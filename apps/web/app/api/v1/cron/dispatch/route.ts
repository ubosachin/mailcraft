import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { dispatchCampaignInline } from '@/lib/campaign-dispatcher';
import { getAppUrl } from '@/lib/url';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export const maxDuration = 60;

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const expectedSecret = (process.env.CRON_SECRET || process.env.APP_SECRET || '').trim();
  if (!expectedSecret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) return false;

  const a = Buffer.from(bearer);
  const b = Buffer.from(expectedSecret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Dispatches due scheduled campaigns or remaining queued batches.
 * Secured via `Authorization: Bearer <CRON_SECRET|APP_SECRET>`.
 */
async function handleCronDispatch(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return jsonError('Unauthorized cron invocation', 401);
    }

    await connectToDatabase();

    const now = new Date();
    const dueCampaigns = await Campaign.find({
      $or: [
        { status: 'scheduled', scheduledAt: { $lte: now } },
        { status: 'queued' },
      ],
    })
      .sort({ scheduledAt: 1, updatedAt: 1 })
      .limit(5)
      .lean();

    const appUrl = getAppUrl(request);
    const processed: Array<{ campaignId: string; status: string; accepted: number; failed: number }> = [];

    for (const camp of dueCampaigns) {
      const result = await dispatchCampaignInline(camp._id.toString(), {
        appUrl,
        maxDurationMs: 10000,
      });
      processed.push({
        campaignId: camp._id.toString(),
        status: result.status,
        accepted: result.accepted,
        failed: result.failed,
      });
    }

    return jsonSuccess({
      checkedAt: now.toISOString(),
      processedCount: processed.length,
      processed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleCronDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleCronDispatch(request);
}


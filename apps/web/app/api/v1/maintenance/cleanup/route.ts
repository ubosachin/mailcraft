import { NextRequest } from 'next/server';
import { connectToDatabase, cleanupExpiredGuestData } from '@mailcraft/database';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secretParam = request.nextUrl.searchParams.get('secret');
    const appSecret = process.env.APP_SECRET;

    // Verify maintenance authorization
    const isAuthorized =
      (authHeader && authHeader === `Bearer ${appSecret}`) ||
      (secretParam && secretParam === appSecret) ||
      process.env.NODE_ENV !== 'production';

    if (!isAuthorized) {
      return jsonError('Unauthorized maintenance request', 401);
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const retentionDays = typeof body.retentionDays === 'number' ? body.retentionDays : 7;
    const webhookRetentionDays =
      typeof body.webhookRetentionDays === 'number' ? body.webhookRetentionDays : 30;

    await connectToDatabase();

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await cleanupExpiredGuestData({
      cutoffDate,
      webhookRetentionDays,
      dryRun,
    });

    return jsonSuccess(
      result,
      200,
      dryRun
        ? 'Data retention cleanup preview generated (dry-run)'
        : 'Expired guest sessions and orphaned records pruned successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}


import { NextRequest } from 'next/server';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { validateCampaignReadiness } from '@/lib/campaign-validator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await validateCampaignReadiness({
      sessionId: session._id,
      campaignId: id,
      idempotencyKey: body.idempotencyKey,
    });

    return jsonSuccess({
      campaignId: id,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


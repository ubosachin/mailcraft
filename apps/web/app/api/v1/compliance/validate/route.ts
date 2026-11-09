import { NextRequest } from 'next/server';
import { complianceValidateSchema } from '@mailcraft/validation';
import { resolveGuestSession } from '@/lib/session';
import { validateCampaignCompliance } from '@/lib/compliance-validator';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) return jsonError('Guest session required', 401);

    const body = await request.json();
    const { campaignId } = complianceValidateSchema.parse(body);

    const report = await validateCampaignCompliance(campaignId, session._id.toString());

    return jsonSuccess(report, 200, 'Compliance validation audit completed');
  } catch (error) {
    return handleApiError(error);
  }
}


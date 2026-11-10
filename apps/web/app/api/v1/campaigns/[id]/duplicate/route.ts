import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

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

    await connectToDatabase();

    const original = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!original) {
      return jsonError('Source campaign not found', 404);
    }

    const clonedName = body.campaignName?.trim() || `${original.campaignName} (Copy)`;

    const cloned = await Campaign.create({
      sessionId: session._id,
      brandId: original.brandId,
      connectionId: original.connectionId || null,
      campaignName: clonedName,
      description: original.description || '',
      subject: original.subject,
      preheader: original.preheader || '',
      senderName: original.senderName,
      senderEmail: original.senderEmail,
      provider: original.provider || 'mock',
      templateId: original.templateId || null,
      editorData: original.editorData || {},
      audienceType: original.audienceType || 'all_eligible',
      audienceFilters: original.audienceFilters || {},
      recipientCount: 0,
      eligibleRecipientCount: 0,
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
        id: cloned._id.toString(),
        campaignName: cloned.campaignName,
        subject: cloned.subject,
        status: cloned.status,
        recipientCount: cloned.recipientCount,
        createdAt: cloned.createdAt.toISOString(),
      },
      201,
      'Campaign duplicated successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

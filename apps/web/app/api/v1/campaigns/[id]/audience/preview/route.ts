import { NextRequest } from 'next/server';
import { connectToDatabase, Contact, Segment } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { applySegmentFilters } from '@/lib/contact-service';

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

    const baseFilter: Record<string, unknown> = { sessionId: session._id };

    if (body.audienceType === 'segment' && body.segmentId) {
      const seg = await Segment.findOne({ _id: body.segmentId, sessionId: session._id });
      if (seg && seg.filters) {
        applySegmentFilters(baseFilter, seg.filters);
      }
    } else if (body.audienceType === 'tag' && body.tag) {
      baseFilter.tags = body.tag;
    } else if (body.audienceType === 'custom_selection' && Array.isArray(body.contactIds)) {
      baseFilter._id = { $in: body.contactIds };
    }

    const [
      selectedCount,
      eligibleCount,
      unknownConsentCount,
      unsubscribedCount,
      suppressedCount,
    ] = await Promise.all([
      Contact.countDocuments(baseFilter),
      Contact.countDocuments({ ...baseFilter, consentStatus: 'opted_in' }),
      Contact.countDocuments({ ...baseFilter, consentStatus: 'unknown' }),
      Contact.countDocuments({ ...baseFilter, consentStatus: 'unsubscribed' }),
      Contact.countDocuments({ ...baseFilter, consentStatus: 'suppressed' }),
    ]);

    return jsonSuccess({
      campaignId: id,
      selectedCount,
      eligibleCount,
      ineligibleCount: selectedCount - eligibleCount,
      unknownConsentCount,
      unsubscribedCount,
      suppressedCount,
      invalidCount: 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

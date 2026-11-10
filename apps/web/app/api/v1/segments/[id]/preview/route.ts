import { NextRequest } from 'next/server';
import { connectToDatabase, Segment, Contact } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { applySegmentFilters } from '@/lib/contact-service';

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
    await connectToDatabase();

    const segment = await Segment.findOne({ _id: id, sessionId: session._id });
    if (!segment) {
      return jsonError('Segment not found', 404);
    }

    const filter: Record<string, unknown> = { sessionId: session._id };
    if (segment.filters) {
      applySegmentFilters(filter, segment.filters);
    }

    const [contacts, totalMatching, eligibleCount] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
      Contact.countDocuments(filter),
      Contact.countDocuments({ ...filter, consentStatus: 'opted_in' }),
    ]);

    return jsonSuccess({
      segmentId: segment._id.toString(),
      segmentName: segment.name,
      totalMatching,
      eligibleCount,
      contacts: contacts.map((c) => ({
        id: c._id.toString(),
        email: c.email,
        name: c.name,
        company: c.company,
        consentStatus: c.consentStatus,
        tags: c.tags,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

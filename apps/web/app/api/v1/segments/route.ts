import { NextRequest } from 'next/server';
import { createSegmentSchema } from '@mailcraft/validation';
import { connectToDatabase, Segment, Contact } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { applySegmentFilters } from '@/lib/contact-service';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();
    const segments = await Segment.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .lean();

    // Dynamically calculate current contact count for each segment
    const enriched = await Promise.all(
      segments.map(async (seg) => {
        const filter: Record<string, unknown> = { sessionId: session._id };
        if (seg.filters) {
          applySegmentFilters(filter, seg.filters);
        }
        const count = await Contact.countDocuments(filter);
        return {
          id: seg._id.toString(),
          name: seg.name,
          description: seg.description,
          filters: seg.filters,
          contactCount: count,
          createdAt: seg.createdAt.toISOString(),
          updatedAt: seg.updatedAt.toISOString(),
        };
      })
    );

    return jsonSuccess(enriched);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = createSegmentSchema.parse(body);

    await connectToDatabase();

    // Calculate initial contact count
    const filter: Record<string, unknown> = { sessionId: session._id };
    applySegmentFilters(filter, validated.filters);
    const count = await Contact.countDocuments(filter);

    const segment = await Segment.create({
      sessionId: session._id,
      name: validated.name,
      description: validated.description,
      filters: validated.filters,
      contactCount: count,
    });

    return jsonSuccess(
      {
        id: segment._id.toString(),
        name: segment.name,
        description: segment.description,
        filters: segment.filters,
        contactCount: count,
        createdAt: segment.createdAt.toISOString(),
      },
      201,
      'Segment created'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

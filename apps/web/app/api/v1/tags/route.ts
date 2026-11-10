import { NextRequest } from 'next/server';
import { createTagSchema } from '@mailcraft/validation';
import { connectToDatabase, Tag, Contact } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();
    const tags = await Tag.find({ sessionId: session._id }).sort({ name: 1 }).lean();

    // Recalculate dynamic contact counts for consistency
    const enriched = await Promise.all(
      tags.map(async (t) => {
        const count = await Contact.countDocuments({
          sessionId: session._id,
          tags: t.name,
        });
        return {
          id: t._id.toString(),
          name: t.name,
          color: t.color,
          contactCount: count,
          createdAt: t.createdAt.toISOString(),
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
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = createTagSchema.parse(body);

    await connectToDatabase();

    const tag = await Tag.findOneAndUpdate(
      { sessionId: session._id, name: validated.name.trim() },
      {
        $set: {
          color: validated.color || '#6366F1',
        },
      },
      { upsert: true, new: true }
    );

    const count = await Contact.countDocuments({
      sessionId: session._id,
      tags: tag.name,
    });

    return jsonSuccess(
      {
        id: tag._id.toString(),
        name: tag.name,
        color: tag.color,
        contactCount: count,
      },
      201,
      'Tag created'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

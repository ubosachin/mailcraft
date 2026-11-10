import { NextRequest } from 'next/server';
import { updateSegmentSchema } from '@mailcraft/validation';
import { connectToDatabase, Segment, Contact } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { applySegmentFilters } from '@/lib/contact-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
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
    const count = await Contact.countDocuments(filter);

    return jsonSuccess({
      id: segment._id.toString(),
      name: segment.name,
      description: segment.description,
      filters: segment.filters,
      contactCount: count,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSegmentSchema.parse(body);

    await connectToDatabase();

    const segment = await Segment.findOne({ _id: id, sessionId: session._id });
    if (!segment) {
      return jsonError('Segment not found', 404);
    }

    if (validated.name !== undefined) segment.name = validated.name;
    if (validated.description !== undefined) segment.description = validated.description;
    if (validated.filters !== undefined) segment.filters = validated.filters;

    const filter: Record<string, unknown> = { sessionId: session._id };
    applySegmentFilters(filter, segment.filters);
    segment.contactCount = await Contact.countDocuments(filter);

    await segment.save();

    return jsonSuccess({
      id: segment._id.toString(),
      name: segment.name,
      description: segment.description,
      filters: segment.filters,
      contactCount: segment.contactCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const deleted = await Segment.findOneAndDelete({
      _id: id,
      sessionId: session._id,
    });

    if (!deleted) {
      return jsonError('Segment not found or access denied', 404);
    }

    return jsonSuccess({ id }, 200, 'Segment deleted');
  } catch (error) {
    return handleApiError(error);
  }
}

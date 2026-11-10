import { NextRequest } from 'next/server';
import { updateTagSchema } from '@mailcraft/validation';
import { connectToDatabase, Tag, Contact } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

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
    const validated = updateTagSchema.parse(body);

    await connectToDatabase();

    const tag = await Tag.findOne({ _id: id, sessionId: session._id });
    if (!tag) {
      return jsonError('Tag not found', 404);
    }

    const oldName = tag.name;

    if (validated.name && validated.name !== oldName) {
      tag.name = validated.name.trim();
      // Update across contacts
      await Contact.updateMany(
        { sessionId: session._id, tags: oldName },
        { $set: { 'tags.$': tag.name } }
      );
    }

    if (validated.color) {
      tag.color = validated.color;
    }

    await tag.save();

    const count = await Contact.countDocuments({
      sessionId: session._id,
      tags: tag.name,
    });

    return jsonSuccess({
      id: tag._id.toString(),
      name: tag.name,
      color: tag.color,
      contactCount: count,
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

    const tag = await Tag.findOneAndDelete({ _id: id, sessionId: session._id });
    if (!tag) {
      return jsonError('Tag not found or access denied', 404);
    }

    // Pull tag from contacts
    await Contact.updateMany(
      { sessionId: session._id, tags: tag.name },
      { $pull: { tags: tag.name } }
    );

    return jsonSuccess({ id }, 200, 'Tag deleted');
  } catch (error) {
    return handleApiError(error);
  }
}

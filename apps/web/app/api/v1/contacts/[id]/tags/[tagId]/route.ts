import { NextRequest } from 'next/server';
import { connectToDatabase, Contact, Tag } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id, tagId } = await params;
    await connectToDatabase();

    const contact = await Contact.findOne({ _id: id, sessionId: session._id });
    if (!contact) {
      return jsonError('Contact not found', 404);
    }

    // tagId could be Tag._id or tag name
    let tagNameToRemove = decodeURIComponent(tagId);
    if (/^[0-9a-fA-F]{24}$/.test(tagId)) {
      const tagDoc = await Tag.findById(tagId);
      if (tagDoc) {
        tagNameToRemove = tagDoc.name;
      }
    }

    contact.tags = contact.tags.filter((t) => t !== tagNameToRemove);
    await contact.save();

    return jsonSuccess({
      contactId: contact._id.toString(),
      tags: contact.tags,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectToDatabase, Contact, Tag } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const assignTagSchema = z
  .object({
    tag: z.string().trim().min(1).max(50).optional(),
    tagName: z.string().trim().min(1).max(50).optional(),
  })
  .refine((d) => d.tag || d.tagName, {
    message: 'Either tag or tagName is required',
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const validated = assignTagSchema.parse(body);
    const tagName = (validated.tag || validated.tagName)!.trim().toLowerCase();

    await connectToDatabase();

    const contact = await Contact.findOne({ _id: id, sessionId: session._id });
    if (!contact) {
      return jsonError('Contact not found', 404);
    }

    // Ensure tag exists in Tag collection
    await Tag.findOneAndUpdate(
      { sessionId: session._id, name: tagName },
      { $setOnInsert: { color: '#6366F1' } },
      { upsert: true }
    );

    if (!contact.tags.includes(tagName)) {
      contact.tags.push(tagName);
      await contact.save();
    }

    return jsonSuccess({
      contactId: contact._id.toString(),
      tags: contact.tags,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

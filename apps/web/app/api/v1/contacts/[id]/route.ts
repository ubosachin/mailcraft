import { NextRequest } from 'next/server';
import { connectToDatabase, Contact } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const deleted = await Contact.findOneAndDelete({
      _id: id,
      sessionId: session._id,
    });

    if (!deleted) {
      return jsonError('Contact not found or access denied', 404);
    }

    return jsonSuccess({ id }, 200, 'Contact removed');
  } catch (error) {
    return handleApiError(error);
  }
}


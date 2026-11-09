import { NextRequest } from 'next/server';
import { connectToDatabase, EmailConnection } from '@mailcraft/database';
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

    const deleted = await EmailConnection.findOneAndDelete({
      _id: id,
      sessionId: session._id,
    });

    if (!deleted) {
      return jsonError('Connection not found or access denied', 404);
    }

    return jsonSuccess({ id }, 200, 'Sending account disconnected');
  } catch (error) {
    return handleApiError(error);
  }
}


import { NextRequest } from 'next/server';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

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
    await connectToDatabase();

    const imp = await ContactImport.findOne({ _id: id, sessionId: session._id });
    if (!imp) {
      return jsonError('Import not found', 404);
    }

    if (imp.status === 'completed') {
      return jsonError('Cannot cancel a completed import', 400);
    }

    imp.status = 'cancelled';
    await imp.save();

    return jsonSuccess({ id: imp._id.toString(), status: 'cancelled' }, 200, 'Import cancelled');
  } catch (error) {
    return handleApiError(error);
  }
}

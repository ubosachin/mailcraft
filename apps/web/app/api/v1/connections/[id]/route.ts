import { NextRequest } from 'next/server';
import { connectToDatabase, EmailConnection } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

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

    const connection = await EmailConnection.findOne({
      _id: id,
      sessionId: session._id,
      status: { $ne: 'disconnected' },
    });

    if (!connection) {
      return jsonError('Connection not found', 404);
    }

    return jsonSuccess({
      id: connection._id.toString(),
      provider: connection.provider,
      senderEmail: connection.senderEmail,
      senderName: connection.senderName,
      status: connection.status,
      senderVerificationStatus: connection.senderVerificationStatus,
      providerAccountStatus: connection.providerAccountStatus,
      lastVerifiedAt: connection.lastVerifiedAt?.toISOString(),
      lastError: connection.lastError,
      verifiedAt: connection.verifiedAt?.toISOString(),
      createdAt: connection.createdAt.toISOString(),
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

    const deleted = await EmailConnection.findOneAndDelete({
      _id: id,
      sessionId: session._id,
    });

    if (!deleted) {
      return jsonError('Connection not found or access denied', 404);
    }

    return jsonSuccess({ id }, 200, 'Sending account disconnected and credentials removed');
  } catch (error) {
    return handleApiError(error);
  }
}

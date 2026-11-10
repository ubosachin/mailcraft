import { NextRequest } from 'next/server';
import {
  connectToDatabase,
  Suppression,
  decryptCredentials,
} from '@mailcraft/database';
import { removeSuppressionSchema } from '@mailcraft/validation';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) return jsonError('Authentication required', 401);

    const { id } = await params;
    await connectToDatabase();

    const entry = await Suppression.findOne({
      _id: id,
      $or: [{ sessionId: session._id }, { scope: 'global' }],
    });

    if (!entry) return jsonError('Suppression entry not found', 404);

    let email = '';
    try {
      if (entry.emailEncrypted && entry.emailEncrypted.startsWith('{')) {
        const parsed = JSON.parse(entry.emailEncrypted);
        email = decryptCredentials<string>(parsed);
      }
    } catch {
      email = '';
    }

    return jsonSuccess({
      id: entry._id.toString(),
      email,
      reason: entry.reason,
      scope: entry.scope,
      metadata: entry.metadata,
      createdAt: entry.createdAt.toISOString(),
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
    if (!session) return jsonError('Authentication required', 401);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validated = removeSuppressionSchema.parse(body);

    await connectToDatabase();

    const entry = await Suppression.findOne({
      _id: id,
      $or: [{ sessionId: session._id }, { scope: 'global' }],
    });

    if (!entry) return jsonError('Suppression entry not found', 404);

    // Section 9: "Any removal of a suppression entry must require an explicit, auditable administrative action and must not override a legally required or complaint-based suppression."
    if (['complaint', 'hard_bounce'].includes(entry.reason) && !validated.force) {
      return jsonError(
        `Removal of '${entry.reason}' suppression is legally restricted. Pass 'force: true' and a documented audit justification to override.`,
        403,
        {
          reason: entry.reason,
          restricted: true,
          actionRequired: 'Provide documented affidavit of address reactivation and force: true',
        }
      );
    }

    await Suppression.deleteOne({ _id: entry._id });

    console.log(
      `[SuppressionAudit] Entry ${id} (${entry.reason}) removed by session ${session._id}. Audit Reason: "${validated.auditReason}"`
    );

    return jsonSuccess(
      {
        id,
        removed: true,
        auditReason: validated.auditReason,
      },
      200,
      'Suppression entry successfully removed with audit record'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

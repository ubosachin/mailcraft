import { NextRequest } from 'next/server';
import { bulkContactImportSchema } from '@mailcraft/validation';
import { connectToDatabase, Contact } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    const { contacts, consentConfirmed } = bulkContactImportSchema.parse(body);

    if (!consentConfirmed) {
      return jsonError('Explicit marketing consent confirmation is required', 400);
    }

    await connectToDatabase();

    const ops = contacts.map((c) => ({
      updateOne: {
        filter: { sessionId: session._id, email: c.email.toLowerCase().trim() },
        update: {
          $set: {
            name: c.name || '',
            consentStatus: 'opted_in' as const,
            consentSource: 'guest_bulk_import',
            consentAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(ops);

    const totalInSession = await Contact.countDocuments({
      sessionId: session._id,
      consentStatus: 'opted_in',
    });

    return jsonSuccess({
      importedCount: result.upsertedCount + result.modifiedCount,
      totalContacts: totalInSession,
      message: `Successfully registered ${result.upsertedCount + result.modifiedCount} opt-in contacts`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


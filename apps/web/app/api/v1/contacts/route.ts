import { NextRequest } from 'next/server';
import { singleContactSchema } from '@mailcraft/validation';
import { connectToDatabase, Contact } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    await connectToDatabase();
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 100, 500);
    const page = Math.max(Number(request.nextUrl.searchParams.get('page')) || 1, 1);
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      Contact.find({ sessionId: session._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contact.countDocuments({ sessionId: session._id }),
    ]);

    return jsonSuccess({
      contacts: contacts.map((c) => ({
        id: c._id.toString(),
        email: c.email,
        name: c.name,
        consentStatus: c.consentStatus,
        consentSource: c.consentSource,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    const validated = singleContactSchema.parse(body);

    await connectToDatabase();
    const contact = await Contact.findOneAndUpdate(
      { sessionId: session._id, email: validated.email },
      {
        $set: {
          name: validated.name || '',
          consentStatus: 'opted_in',
          consentSource: 'manual_entry',
          consentAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return jsonSuccess(
      {
        id: contact._id.toString(),
        email: contact.email,
        name: contact.name,
        consentStatus: contact.consentStatus,
      },
      201,
      'Contact added'
    );
  } catch (error) {
    return handleApiError(error);
  }
}


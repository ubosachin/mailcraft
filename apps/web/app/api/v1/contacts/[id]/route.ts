import { NextRequest } from 'next/server';
import { updateContactSchema } from '@mailcraft/validation';
import { connectToDatabase, Contact } from '@mailcraft/database';
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

    const contact = await Contact.findOne({ _id: id, sessionId: session._id });
    if (!contact) {
      return jsonError('Contact not found', 404);
    }

    return jsonSuccess({
      id: contact._id.toString(),
      email: contact.email,
      normalizedEmail: contact.normalizedEmail,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.name,
      company: contact.company,
      phone: contact.phone,
      tags: contact.tags || [],
      consentStatus: contact.consentStatus,
      consentSource: contact.consentSource,
      consentAt: contact.consentAt?.toISOString(),
      consentEvidence: contact.consentEvidence,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

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
    const validated = updateContactSchema.parse(body);

    await connectToDatabase();

    const contact = await Contact.findOne({ _id: id, sessionId: session._id });
    if (!contact) {
      return jsonError('Contact not found', 404);
    }

    if (validated.firstName !== undefined) contact.firstName = validated.firstName;
    if (validated.lastName !== undefined) contact.lastName = validated.lastName;
    if (validated.name !== undefined) {
      contact.name = validated.name;
    } else if (validated.firstName || validated.lastName) {
      contact.name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    }
    if (validated.company !== undefined) contact.company = validated.company;
    if (validated.phone !== undefined) contact.phone = validated.phone;
    if (validated.tags !== undefined) contact.tags = validated.tags;
    if (validated.consentStatus !== undefined) {
      contact.consentStatus = validated.consentStatus;
      if (validated.consentStatus === 'opted_in' && !contact.consentAt) {
        contact.consentAt = new Date();
      }
    }
    if (validated.consentSource !== undefined) contact.consentSource = validated.consentSource;
    if (validated.consentEvidence !== undefined) contact.consentEvidence = validated.consentEvidence;

    await contact.save();

    return jsonSuccess(
      {
        id: contact._id.toString(),
        email: contact.email,
        name: contact.name,
        company: contact.company,
        tags: contact.tags,
        consentStatus: contact.consentStatus,
        consentEvidence: contact.consentEvidence,
      },
      200,
      'Contact updated'
    );
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

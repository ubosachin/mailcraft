import { NextRequest } from 'next/server';
import { singleContactSchema } from '@mailcraft/validation';
import { connectToDatabase, Contact, Tag } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import {
  buildContactFilter,
  calculateContactStats,
} from '@/lib/contact-service';
import { validateEmailSyntax } from '@/lib/email-validator';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 25, 1), 500);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const skip = (page - 1) * limit;

    const queryOptions = {
      search: searchParams.get('search') || undefined,
      consentStatus: searchParams.get('consentStatus') || undefined,
      tag: searchParams.get('tag') || undefined,
      company: searchParams.get('company') || undefined,
      segmentId: searchParams.get('segmentId') || undefined,
    };

    const filter = await buildContactFilter(session._id, queryOptions);

    const [contacts, totalFiltered, stats] = await Promise.all([
      Contact.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments(filter),
      calculateContactStats(session._id),
    ]);

    return jsonSuccess({
      contacts: contacts.map((c) => ({
        id: c._id.toString(),
        email: c.email,
        normalizedEmail: c.normalizedEmail,
        firstName: c.firstName,
        lastName: c.lastName,
        name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined,
        company: c.company,
        phone: c.phone,
        tags: c.tags || [],
        consentStatus: c.consentStatus,
        consentSource: c.consentSource,
        consentAt: c.consentAt?.toISOString(),
        consentEvidence: c.consentEvidence,
        createdAt: c.createdAt.toISOString(),
      })),
      stats,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
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
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = singleContactSchema.parse(body);

    const syntax = validateEmailSyntax(validated.email);
    if (!syntax.valid) {
      return jsonError(syntax.error || 'Invalid email address syntax', 400);
    }

    await connectToDatabase();

    const normalizedEmail = syntax.normalizedEmail;
    const computedName =
      validated.name ||
      [validated.firstName, validated.lastName].filter(Boolean).join(' ') ||
      undefined;

    const existing = await Contact.findOne({ sessionId: session._id, normalizedEmail });
    if (existing) {
      return jsonError('A contact with this email address already exists in your audience', 409);
    }

    const contact = await Contact.create({
      sessionId: session._id,
      email: validated.email,
      normalizedEmail,
      firstName: validated.firstName,
      lastName: validated.lastName,
      name: computedName,
      company: validated.company,
      phone: validated.phone,
      tags: validated.tags || [],
      consentStatus: validated.consentStatus || 'unknown',
      consentSource: validated.consentSource || 'manual_entry',
      consentAt: validated.consentStatus === 'opted_in' ? (validated.consentAt || new Date()) : undefined,
      consentEvidence: validated.consentEvidence,
      consentPolicyVersion: validated.consentPolicyVersion || 'v1.0',
    });

    // Update tag counts if tags provided
    if (validated.tags && validated.tags.length > 0) {
      for (const tName of validated.tags) {
        await Tag.findOneAndUpdate(
          { sessionId: session._id, name: tName.trim() },
          { $setOnInsert: { color: '#6366F1' }, $inc: { contactCount: 1 } },
          { upsert: true }
        );
      }
    }

    return jsonSuccess(
      {
        id: contact._id.toString(),
        email: contact.email,
        normalizedEmail: contact.normalizedEmail,
        name: contact.name,
        company: contact.company,
        tags: contact.tags,
        consentStatus: contact.consentStatus,
        consentSource: contact.consentSource,
        createdAt: contact.createdAt.toISOString(),
      },
      201,
      'Contact saved'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

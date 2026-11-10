import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'anonymous';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { searchParams } = request.nextUrl;
    const campaignId = searchParams.get('campaignId');
    const eventType = searchParams.get('eventType');
    const provider = searchParams.get('provider');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    await connectToDatabase();

    const query: Record<string, unknown> = {
      sessionId: session._id,
    };

    if (campaignId) {
      query.campaignId = campaignId;
    }
    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }
    if (provider && provider !== 'all') {
      query.provider = provider;
    }
    if (search) {
      query.$or = [
        { eventId: { $regex: search, $options: 'i' } },
        { 'metadata.recipientEmail': { $regex: search, $options: 'i' } },
        { 'metadata.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      EmailEvent.find(query)
        .sort({ eventTimestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailEvent.countDocuments(query),
    ]);

    return jsonSuccess({
      events: events.map((e) => {
        const rawEmail = (e.metadata?.recipientEmail as string) || (e.metadata?.email as string) || '';
        return {
          id: e._id.toString(),
          eventId: e.eventId,
          campaignId: e.campaignId?.toString(),
          eventType: e.eventType,
          provider: e.provider,
          eventTimestamp: e.eventTimestamp?.toISOString(),
          maskedRecipient: maskEmail(rawEmail),
          destinationUrl: (e.metadata?.destinationUrl as string) || null,
          bounceReason: (e.metadata?.reason as string) || (e.metadata?.diagnosticCode as string) || null,
          isBot: Boolean(e.metadata?.isBot),
        };
      }),
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


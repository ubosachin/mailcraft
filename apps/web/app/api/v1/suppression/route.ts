import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Suppression,
  Contact,
  encryptCredentials,
  decryptCredentials,
} from '@mailcraft/database';
import { addSuppressionSchema } from '@mailcraft/validation';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 3))}${user.slice(-1)}@${domain}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const reasonFilter = searchParams.get('reason');
    const search = searchParams.get('search')?.trim().toLowerCase();

    await connectToDatabase();

    // Query entries scoped to this session OR global suppressions
    const query: Record<string, unknown> = {
      $or: [{ sessionId: session._id }, { scope: 'global' }],
    };

    if (reasonFilter && reasonFilter !== 'all') {
      if (reasonFilter === 'bounce') {
        query.reason = { $in: ['bounce', 'hard_bounce', 'soft_bounce_threshold'] };
      } else {
        query.reason = reasonFilter;
      }
    }

    if (search) {
      const searchHash = crypto.createHash('sha256').update(search).digest('hex');
      query.$or = [{ emailHash: searchHash }];
    }

    const [entries, total, countStats] = await Promise.all([
      Suppression.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Suppression.countDocuments(query),
      Suppression.aggregate([
        { $match: { $or: [{ sessionId: session._id }, { scope: 'global' }] } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
      ]),
    ]);

    const stats: Record<string, number> = {
      total: 0,
      unsubscribe: 0,
      hard_bounce: 0,
      complaint: 0,
      manual: 0,
      administrative: 0,
    };

    for (const item of countStats) {
      const reasonKey = item._id;
      stats[reasonKey] = (stats[reasonKey] || 0) + item.count;
      stats.total += item.count;
    }

    const formatted = entries.map((entry) => {
      let emailPlain = '';
      try {
        if (entry.emailEncrypted && entry.emailEncrypted.startsWith('{')) {
          const parsed = JSON.parse(entry.emailEncrypted);
          emailPlain = decryptCredentials<string>(parsed);
        }
      } catch {
        emailPlain = '';
      }

      return {
        id: entry._id.toString(),
        emailMasked: emailPlain ? maskEmail(emailPlain) : `${entry.emailHash.slice(0, 8)}...`,
        emailPlain: emailPlain || undefined,
        reason: entry.reason,
        scope: entry.scope,
        source: entry.metadata?.source || 'system',
        reasonDetail: entry.metadata?.reasonDetail,
        notes: entry.metadata?.notes,
        createdAt: entry.createdAt.toISOString(),
      };
    });

    return jsonSuccess({
      suppressions: formatted,
      stats,
      pagination: {
        total,
        page,
        limit,
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
    const validated = addSuppressionSchema.parse(body);

    await connectToDatabase();

    const normalized = validated.email.toLowerCase().trim();
    const emailHash = crypto.createHash('sha256').update(normalized).digest('hex');
    const encrypted = encryptCredentials(normalized);

    const suppression = await Suppression.findOneAndUpdate(
      {
        emailHash,
        $or: [{ sessionId: session._id }, { scope: validated.scope }],
      },
      {
        $set: {
          emailEncrypted: JSON.stringify(encrypted),
          reason: validated.reason,
          scope: validated.scope,
          sessionId: session._id,
          metadata: {
            reasonDetail: validated.reasonDetail || validated.notes || 'Manually added by workspace operator',
            source: 'manual_admin',
            notes: validated.notes,
            createdBy: session._id.toString(),
          },
        },
      },
      { upsert: true, new: true }
    );

    // Update contacts table to keep state synchronized
    await Contact.updateMany(
      { normalizedEmail: normalized },
      { $set: { consentStatus: 'suppressed' } }
    );

    return jsonSuccess(
      {
        id: suppression._id.toString(),
        email: maskEmail(normalized),
        reason: suppression.reason,
        scope: suppression.scope,
        createdAt: suppression.createdAt.toISOString(),
      },
      201,
      'Email address added to suppression list'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

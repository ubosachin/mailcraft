import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { connectToDatabase, Suppression } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    let rawList: string[] = [];

    if (Array.isArray(body.emails)) {
      rawList = body.emails.map((e: unknown) => String(e));
    } else if (typeof body.rawInput === 'string') {
      // Split by commas, semicolons, whitespace, tabs, newlines
      rawList = body.rawInput.split(/[\s,;]+/).map((s: string) => s.trim()).filter(Boolean);
    } else {
      return jsonError('Provide emails array or rawInput string', 400);
    }

    const totalSubmitted = rawList.length;
    const seen = new Set<string>();
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];
    let duplicatesRemovedCount = 0;

    for (const item of rawList) {
      const email = item.toLowerCase().trim();
      if (!email) continue;

      if (!RFC_EMAIL_REGEX.test(email) || email.length > 254) {
        invalidEmails.push(item);
        continue;
      }

      if (seen.has(email)) {
        duplicatesRemovedCount++;
        continue;
      }

      seen.add(email);
      validEmails.push(email);
    }

    await connectToDatabase();

    // Query suppressions for valid emails
    const hashes = validEmails.map((e) =>
      crypto.createHash('sha256').update(e).digest('hex')
    );

    const suppressions = await Suppression.find({
      emailHash: { $in: hashes },
      $or: [{ scope: 'global' }, { sessionId: session._id }],
    });

    const suppressedHashes = new Set(suppressions.map((s) => s.emailHash));

    const eligibleEmails = validEmails.filter((email) => {
      const h = crypto.createHash('sha256').update(email).digest('hex');
      return !suppressedHashes.has(h);
    });

    return jsonSuccess({
      totalSubmitted,
      validSyntaxCount: validEmails.length,
      invalidSyntaxCount: invalidEmails.length,
      duplicatesRemovedCount,
      suppressedCount: suppressedHashes.size,
      eligibleCount: eligibleEmails.length,
      validEmails,
      eligibleEmails,
      invalidEmails: invalidEmails.slice(0, 50),
    });
  } catch (error) {
    return handleApiError(error);
  }
}


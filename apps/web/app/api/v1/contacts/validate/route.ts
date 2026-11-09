import { NextRequest } from 'next/server';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { validateEmailBatch } from '@/lib/email-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const body = await request.json();
    let rawList: string[] = [];

    if (Array.isArray(body.emails)) {
      rawList = body.emails.map((e: unknown) => String(e).trim()).filter(Boolean);
    } else if (typeof body.rawInput === 'string') {
      // Split by commas, semicolons, whitespace, tabs, newlines
      rawList = body.rawInput
        .split(/[\s,;]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else {
      return jsonError('Provide emails array or rawInput string', 400);
    }

    const totalSubmitted = rawList.length;
    const checkDns = body.checkDnsMx === true;

    // Deduplicate in batch
    const seen = new Set<string>();
    const deduplicatedList: string[] = [];
    let duplicatesRemovedCount = 0;

    for (const item of rawList) {
      const lower = item.toLowerCase();
      if (seen.has(lower)) {
        duplicatesRemovedCount++;
      } else {
        seen.add(lower);
        deduplicatedList.push(item);
      }
    }

    const validationMap = await validateEmailBatch(deduplicatedList, session._id, {
      checkDns,
    });

    const validEmails: string[] = [];
    const invalidEmails: string[] = [];
    const eligibleEmails: string[] = [];
    let suppressedCount = 0;
    let existingCount = 0;

    for (const item of deduplicatedList) {
      const val = validationMap.get(item);
      if (!val || !val.syntaxValid) {
        invalidEmails.push(item);
      } else {
        validEmails.push(val.normalizedEmail);
        if (val.isSuppressed) {
          suppressedCount++;
        } else {
          eligibleEmails.push(val.normalizedEmail);
        }

        if (val.isExisting) {
          existingCount++;
        }
      }
    }

    return jsonSuccess({
      totalSubmitted,
      validSyntaxCount: validEmails.length,
      invalidSyntaxCount: invalidEmails.length,
      duplicatesRemovedCount,
      suppressedCount,
      existingCount,
      eligibleCount: eligibleEmails.length,
      validEmails,
      eligibleEmails,
      invalidEmails: invalidEmails.slice(0, 100),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { bulkContactImportSchema } from '@mailcraft/validation';
import { connectToDatabase, Contact, Suppression, Tag } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { validateEmailSyntax } from '@/lib/email-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = bulkContactImportSchema.parse(body);

    const { contacts, consentConfirmed, consentEvidence, defaultConsentStatus, tags } = validated;

    await connectToDatabase();

    // Deduplicate within the batch & validate syntax
    const seen = new Set<string>();
    const validCandidates: Array<{
      email: string;
      normalizedEmail: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      company?: string;
      phone?: string;
      tags: string[];
      consentStatus: 'opted_in' | 'unknown' | 'unsubscribed' | 'suppressed';
      consentSource: string;
      consentEvidence?: string;
    }> = [];

    let invalidCount = 0;
    let intraDuplicateCount = 0;

    for (const c of contacts) {
      const syntax = validateEmailSyntax(c.email);
      if (!syntax.valid) {
        invalidCount++;
        continue;
      }

      if (seen.has(syntax.normalizedEmail)) {
        intraDuplicateCount++;
        continue;
      }
      seen.add(syntax.normalizedEmail);

      const contactTags = Array.from(new Set([...(tags || []), ...(c.tags || [])]));
      const computedName =
        c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined;

      let resolvedConsent = c.consentStatus || defaultConsentStatus || 'unknown';
      if (consentConfirmed && resolvedConsent === 'unknown') {
        resolvedConsent = 'opted_in';
      }

      validCandidates.push({
        email: c.email,
        normalizedEmail: syntax.normalizedEmail,
        firstName: c.firstName,
        lastName: c.lastName,
        name: computedName,
        company: c.company,
        phone: c.phone,
        tags: contactTags,
        consentStatus: resolvedConsent,
        consentSource: c.consentSource || 'bulk_import',
        consentEvidence: c.consentEvidence || consentEvidence,
      });
    }

    if (validCandidates.length === 0) {
      return jsonError('No valid contacts to import', 400);
    }

    // Check suppressions
    const hashes = validCandidates.map((c) =>
      crypto.createHash('sha256').update(c.normalizedEmail).digest('hex')
    );
    const suppressions = await Suppression.find({
      emailHash: { $in: hashes },
      $or: [{ scope: 'global' }, { sessionId: session._id }],
    });
    const suppressedHashSet = new Set(suppressions.map((s) => s.emailHash));

    // Prepare bulk write operations
    const ops = validCandidates.map((c) => {
      const h = crypto.createHash('sha256').update(c.normalizedEmail).digest('hex');
      const isSuppressed = suppressedHashSet.has(h);
      const finalConsent = isSuppressed ? 'suppressed' : c.consentStatus;

      return {
        updateOne: {
          filter: { sessionId: session._id, normalizedEmail: c.normalizedEmail },
          update: {
            $set: {
              email: c.email,
              normalizedEmail: c.normalizedEmail,
              firstName: c.firstName,
              lastName: c.lastName,
              name: c.name,
              company: c.company,
              phone: c.phone,
              tags: c.tags,
              consentStatus: finalConsent,
              consentSource: c.consentSource,
              consentAt: finalConsent === 'opted_in' ? new Date() : undefined,
              consentEvidence: c.consentEvidence,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Contact.bulkWrite(ops);

    // Update tags
    if (tags && tags.length > 0) {
      for (const tName of tags) {
        await Tag.findOneAndUpdate(
          { sessionId: session._id, name: tName.trim() },
          { $setOnInsert: { color: '#6366F1' }, $inc: { contactCount: validCandidates.length } },
          { upsert: true }
        );
      }
    }

    const totalContacts = await Contact.countDocuments({ sessionId: session._id });
    const eligibleContacts = await Contact.countDocuments({
      sessionId: session._id,
      consentStatus: 'opted_in',
    });

    return jsonSuccess({
      importedCount: result.upsertedCount + result.modifiedCount,
      newlyCreated: result.upsertedCount,
      updatedExisting: result.modifiedCount,
      suppressedCount: suppressedHashSet.size,
      invalidSyntaxCount: invalidCount,
      duplicatesRemovedCount: intraDuplicateCount,
      totalContacts,
      eligibleContacts,
      message: `Successfully processed ${validCandidates.length} contacts (${result.upsertedCount} added, ${result.modifiedCount} updated)`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

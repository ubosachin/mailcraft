import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import {
  connectToDatabase,
  Contact,
  ContactImport,
  Suppression,
  Tag,
} from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { validateEmailSyntax } from '@/lib/email-validator';

const importConfirmSchema = z.object({
  importId: z.string().trim().min(1),
  columnMapping: z.record(z.string()).optional(),
  consentConfirmed: z.boolean().default(false),
  consentEvidence: z.string().trim().max(500).optional(),
  defaultConsentStatus: z
    .enum(['opted_in', 'unknown', 'unsubscribed', 'suppressed'])
    .default('unknown'),
  tags: z.array(z.string().trim().max(50)).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = importConfirmSchema.parse(body);

    await connectToDatabase();

    const importDoc = await ContactImport.findOne({
      _id: validated.importId,
      sessionId: session._id,
    });

    if (!importDoc) {
      return jsonError('Import batch not found or access denied', 404);
    }

    if (importDoc.status === 'completed') {
      return jsonError('This import batch has already been processed', 400);
    }

    const columnMapping = validated.columnMapping || importDoc.columnMapping || {};
    const emailCol = columnMapping.email;
    const rawRows = importDoc.previewRows || [];

    if (!emailCol) {
      return jsonError('Email column mapping is missing', 400);
    }

    importDoc.status = 'processing';
    await importDoc.save();

    const seen = new Set<string>();
    const validCandidates: Array<{
      email: string;
      normalizedEmail: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      company?: string;
      phone?: string;
      consentStatus: 'opted_in' | 'unknown' | 'unsubscribed' | 'suppressed';
      consentSource: string;
      consentEvidence?: string;
    }> = [];

    const defaultConsent = validated.consentConfirmed
      ? validated.defaultConsentStatus || 'opted_in'
      : 'unknown';

    for (const row of rawRows) {
      const rawEmail = row[emailCol] ? String(row[emailCol]).trim() : '';
      const syntax = validateEmailSyntax(rawEmail);
      if (!syntax.valid) continue;

      if (seen.has(syntax.normalizedEmail)) continue;
      seen.add(syntax.normalizedEmail);

      const firstName = columnMapping.firstName ? String(row[columnMapping.firstName] || '').trim() : undefined;
      const lastName = columnMapping.lastName ? String(row[columnMapping.lastName] || '').trim() : undefined;
      const name = columnMapping.name
        ? String(row[columnMapping.name] || '').trim()
        : [firstName, lastName].filter(Boolean).join(' ') || undefined;
      const company = columnMapping.company ? String(row[columnMapping.company] || '').trim() : undefined;
      const phone = columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : undefined;

      let consentStatus = defaultConsent;
      if (columnMapping.consentStatus && row[columnMapping.consentStatus]) {
        const cVal = String(row[columnMapping.consentStatus]).toLowerCase().trim();
        if (['opted_in', 'optin', 'yes', 'true', '1'].includes(cVal) && validated.consentConfirmed) {
          consentStatus = 'opted_in';
        } else if (['unsubscribed', 'optout', 'no'].includes(cVal)) {
          consentStatus = 'unsubscribed';
        } else {
          consentStatus = 'unknown';
        }
      }

      validCandidates.push({
        email: rawEmail,
        normalizedEmail: syntax.normalizedEmail,
        firstName,
        lastName,
        name,
        company,
        phone,
        consentStatus,
        consentSource: `${importDoc.fileType}_import`,
        consentEvidence: validated.consentEvidence || `Imported via file: ${importDoc.originalFilename}`,
      });
    }

    // Check suppressions
    const hashes = validCandidates.map((c) =>
      crypto.createHash('sha256').update(c.normalizedEmail).digest('hex')
    );
    const suppressions = await Suppression.find({
      emailHash: { $in: hashes },
      $or: [{ scope: 'global' }, { sessionId: session._id }],
    });
    const suppressedSet = new Set(suppressions.map((s) => s.emailHash));

    const extraTags = validated.tags || [];

    const ops = validCandidates.map((c) => {
      const h = crypto.createHash('sha256').update(c.normalizedEmail).digest('hex');
      const isSuppressed = suppressedSet.has(h);
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
              consentStatus: finalConsent,
              consentSource: c.consentSource,
              consentAt: finalConsent === 'opted_in' ? new Date() : undefined,
              consentEvidence: c.consentEvidence,
              importBatchId: importDoc._id,
            },
            $addToSet: {
              tags: { $each: extraTags },
            },
          },
          upsert: true,
        },
      };
    });

    let upsertedCount = 0;
    let modifiedCount = 0;

    if (ops.length > 0) {
      const writeResult = await Contact.bulkWrite(ops);
      upsertedCount = writeResult.upsertedCount;
      modifiedCount = writeResult.modifiedCount;
    }

    importDoc.importedRows = upsertedCount + modifiedCount;
    importDoc.status = 'completed';
    importDoc.completedAt = new Date();
    await importDoc.save();

    // Update tag counts
    if (extraTags.length > 0) {
      for (const tName of extraTags) {
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
      importId: importDoc._id.toString(),
      importedRows: importDoc.importedRows,
      newlyCreated: upsertedCount,
      updatedExisting: modifiedCount,
      totalContacts,
      eligibleContacts,
      status: 'completed',
      message: `Successfully imported ${importDoc.importedRows} contacts from ${importDoc.originalFilename}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

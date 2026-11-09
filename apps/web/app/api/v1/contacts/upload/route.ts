import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { connectToDatabase, Contact, Suppression } from '@mailcraft/database';
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const consentConfirmed = formData.get('consentConfirmed') === 'true';

    if (!consentConfirmed) {
      return jsonError('You must confirm that all recipients gave explicit opt-in consent', 400);
    }

    if (!file) {
      return jsonError('No file provided for upload', 400);
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/);

    const candidates: Array<{ email: string; name: string }> = [];

    // Parse CSV lines
    let isHeader = true;
    let emailIdx = 0;
    let nameIdx = -1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const cells = line.split(/[,;\t]/).map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (isHeader) {
        // Detect headers
        const lowerCells = cells.map((c) => c.toLowerCase());
        const foundEmailIdx = lowerCells.findIndex((c) => c.includes('email') || c.includes('mail'));
        const foundNameIdx = lowerCells.findIndex(
          (c) => c.includes('name') || c.includes('first') || c.includes('contact')
        );

        if (foundEmailIdx !== -1) {
          emailIdx = foundEmailIdx;
          nameIdx = foundNameIdx;
          isHeader = false;
          continue;
        }
        isHeader = false;
      }

      const emailVal = (cells[emailIdx] || '').toLowerCase().trim();
      const nameVal = nameIdx !== -1 ? (cells[nameIdx] || '').trim() : '';

      if (RFC_EMAIL_REGEX.test(emailVal)) {
        candidates.push({ email: emailVal, name: nameVal });
      }
    }

    if (candidates.length === 0) {
      return jsonError('No valid email addresses found in the uploaded file', 400);
    }

    await connectToDatabase();

    // Deduplicate
    const seen = new Set<string>();
    const uniqueCandidates: Array<{ email: string; name: string }> = [];
    for (const c of candidates) {
      if (!seen.has(c.email)) {
        seen.add(c.email);
        uniqueCandidates.push(c);
      }
    }

    // Filter against suppressions
    const hashes = uniqueCandidates.map((c) =>
      crypto.createHash('sha256').update(c.email).digest('hex')
    );

    const suppressions = await Suppression.find({
      emailHash: { $in: hashes },
      $or: [{ scope: 'global' }, { sessionId: session._id }],
    });
    const suppressedHashes = new Set(suppressions.map((s) => s.emailHash));

    const eligible = uniqueCandidates.filter((c) => {
      const h = crypto.createHash('sha256').update(c.email).digest('hex');
      return !suppressedHashes.has(h);
    });

    // Bulk upsert into contacts collection
    const ops = eligible.map((c) => ({
      updateOne: {
        filter: { sessionId: session._id, email: c.email },
        update: {
          $set: {
            name: c.name,
            consentStatus: 'opted_in' as const,
            consentSource: 'csv_file_upload',
            consentAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(ops);

    const totalContacts = await Contact.countDocuments({
      sessionId: session._id,
      consentStatus: 'opted_in',
    });

    return jsonSuccess({
      totalInFile: candidates.length,
      duplicatesRemoved: candidates.length - uniqueCandidates.length,
      suppressedCount: suppressedHashes.size,
      importedCount: eligible.length,
      totalContacts,
      message: `Imported ${eligible.length} permission-based contacts from ${file.name}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


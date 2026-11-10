import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { prepareImportPreview } from '@/lib/import-parser';

const importPreviewSchema = z.object({
  importId: z.string().trim().min(1),
  columnMapping: z.record(z.string()).optional(),
  defaultConsentStatus: z.enum(['opted_in', 'unknown', 'unsubscribed', 'suppressed']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const body = await request.json();
    const validated = importPreviewSchema.parse(body);

    await connectToDatabase();

    const importDoc = await ContactImport.findOne({
      _id: validated.importId,
      sessionId: session._id,
    });

    if (!importDoc) {
      return jsonError('Import batch not found', 404);
    }

    const rawRows = importDoc.previewRows || [];
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

    const preview = await prepareImportPreview({
      importId: importDoc._id.toString(),
      originalFilename: importDoc.originalFilename,
      fileType: importDoc.fileType,
      headers,
      rawRows,
      sessionId: session._id,
      customMapping: validated.columnMapping,
      defaultConsentStatus: validated.defaultConsentStatus,
    });

    importDoc.validRows = preview.validRows;
    importDoc.invalidRows = preview.invalidRows;
    importDoc.duplicateRows = preview.duplicateRows;
    importDoc.existingRows = preview.existingRows;
    importDoc.suppressedRows = preview.suppressedRows;
    importDoc.unknownConsentRows = preview.unknownConsentRows;
    importDoc.columnMapping = preview.columnMapping;
    await importDoc.save();

    return jsonSuccess(preview);
  } catch (error) {
    return handleApiError(error);
  }
}

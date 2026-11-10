import { NextRequest } from 'next/server';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();
    const imports = await ContactImport.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return jsonSuccess(
      imports.map((imp) => ({
        id: imp._id.toString(),
        originalFilename: imp.originalFilename,
        fileType: imp.fileType,
        totalRows: imp.totalRows,
        validRows: imp.validRows,
        invalidRows: imp.invalidRows,
        duplicateRows: imp.duplicateRows,
        existingRows: imp.existingRows,
        suppressedRows: imp.suppressedRows,
        unknownConsentRows: imp.unknownConsentRows,
        importedRows: imp.importedRows,
        status: imp.status,
        createdAt: imp.createdAt.toISOString(),
        completedAt: imp.completedAt ? imp.completedAt.toISOString() : undefined,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from 'next/server';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const imp = await ContactImport.findOne({ _id: id, sessionId: session._id });
    if (!imp) {
      return jsonError('Import not found', 404);
    }

    return jsonSuccess({
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
      columnMapping: imp.columnMapping,
      createdAt: imp.createdAt.toISOString(),
      completedAt: imp.completedAt?.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

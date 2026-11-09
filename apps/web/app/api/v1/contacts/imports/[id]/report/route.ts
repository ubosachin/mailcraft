import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { sanitizeFormulaInjection } from '@/lib/import-parser';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const imp = await ContactImport.findOne({ _id: id, sessionId: session._id });
    if (!imp) {
      return jsonError('Import not found', 404);
    }

    const failedRows = imp.failedRows || [];

    if (request.nextUrl.searchParams.get('format') === 'csv') {
      const csvData = failedRows.map((f) => ({
        'Row Number': f.rowNumber,
        'Failure Reason': sanitizeFormulaInjection(f.reason),
        'Raw Data': sanitizeFormulaInjection(JSON.stringify(f.raw)),
      }));

      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(Buffer.from(csvContent, 'utf-8'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="import_error_report_${imp._id}.csv"`,
        },
      });
    }

    return jsonSuccess({
      importId: imp._id.toString(),
      originalFilename: imp.originalFilename,
      totalFailedRows: failedRows.length,
      failedRows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

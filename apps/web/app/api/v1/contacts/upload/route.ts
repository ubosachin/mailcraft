import { NextRequest } from 'next/server';
import { connectToDatabase, ContactImport } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import {
  parseCsvText,
  parseXlsxBuffer,
  prepareImportPreview,
} from '@/lib/import-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sheetName = formData.get('sheetName') as string | null;

    if (!file) {
      return jsonError('No file provided for upload', 400);
    }

    // File size limit: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return jsonError('File size exceeds the 10MB limit', 400);
    }

    const filename = file.name.toLowerCase();
    const isCsv = filename.endsWith('.csv') || file.type.includes('csv');
    const isXlsx =
      filename.endsWith('.xlsx') ||
      filename.endsWith('.xls') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel');

    if (!isCsv && !isXlsx) {
      return jsonError('Only CSV and XLSX files are supported', 400);
    }

    await connectToDatabase();

    const fileType = isCsv ? 'csv' : 'xlsx';
    let headers: string[] = [];
    let rawRows: Array<Record<string, unknown>> = [];
    let detectedSheets: string[] | undefined;
    let selectedSheet: string | undefined;

    if (isCsv) {
      const text = await file.text();
      const parsed = parseCsvText(text);
      headers = parsed.headers;
      rawRows = parsed.rows.map((r) => {
        const rowObj: Record<string, unknown> = {};
        for (let i = 0; i < headers.length; i++) {
          rowObj[headers[i]] = r[i] || '';
        }
        return rowObj;
      });
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = parseXlsxBuffer(buffer, sheetName || undefined);
      detectedSheets = parsed.sheets;
      selectedSheet = parsed.selectedSheet;
      headers = parsed.headers;
      rawRows = parsed.rows;
    }

    if (rawRows.length === 0) {
      return jsonError('The uploaded file contains no data rows', 400);
    }

    // Create a temporary ContactImport record
    const importDoc = await ContactImport.create({
      sessionId: session._id,
      originalFilename: file.name,
      fileType,
      totalRows: rawRows.length,
      status: 'previewed',
    });

    const preview = await prepareImportPreview({
      importId: importDoc._id.toString(),
      originalFilename: file.name,
      fileType,
      headers,
      rawRows,
      sessionId: session._id,
      detectedSheets,
      selectedSheet,
    });

    // Update import document with preview metadata
    importDoc.validRows = preview.validRows;
    importDoc.invalidRows = preview.invalidRows;
    importDoc.duplicateRows = preview.duplicateRows;
    importDoc.existingRows = preview.existingRows;
    importDoc.suppressedRows = preview.suppressedRows;
    importDoc.unknownConsentRows = preview.unknownConsentRows;
    importDoc.columnMapping = preview.columnMapping;
    importDoc.previewRows = rawRows.slice(0, 100);
    importDoc.failedRows = (preview.errorReport || []).map((e) => ({
      rowNumber: e.rowNumber,
      raw: e.raw,
      reason: e.error,
    }));
    await importDoc.save();

    return jsonSuccess(preview, 201, `Parsed ${rawRows.length} rows from ${file.name}`);
  } catch (error) {
    return handleApiError(error);
  }
}

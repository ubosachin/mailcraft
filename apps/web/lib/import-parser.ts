import * as XLSX from 'xlsx';
import { Types } from 'mongoose';
import {
  ConsentStatus,
  ImportPreviewResult,
  ImportPreviewRow,
} from '@mailcraft/shared-types';
import { validateEmailBatch, validateEmailSyntax } from './email-validator';

/**
 * Escapes characters that can trigger CSV / formula injection in spreadsheets
 */
export function sanitizeFormulaInjection(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Robust CSV parser that handles quotes and multiple line breaks
 */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' || char === "'") {
      if (insideQuotes && nextChar === char) {
        // Escaped quote
        currentField += char;
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === ',' || char === ';' || char === '\t') && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1);
  return { headers, rows };
}

/**
 * Parses XLSX buffer into sheets and rows
 */
export function parseXlsxBuffer(
  buffer: Buffer,
  sheetName?: string
): { sheets: string[]; selectedSheet: string; headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellFormula: false,
    cellHTML: false,
    raw: false,
  });

  const sheets = workbook.SheetNames || [];
  if (sheets.length === 0) {
    throw new Error('XLSX workbook contains no sheets');
  }

  const selectedSheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
  const worksheet = workbook.Sheets[selectedSheet];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    blankrows: false,
  });

  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  return {
    sheets,
    selectedSheet,
    headers,
    rows: rawRows,
  };
}

/**
 * Detects best default column mappings for headers
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const h of headers) {
    const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!mapping.email && (lower.includes('email') || lower.includes('mail') || lower === 'e')) {
      mapping.email = h;
    } else if (!mapping.firstName && (lower === 'firstname' || lower === 'first' || lower === 'givenname')) {
      mapping.firstName = h;
    } else if (!mapping.lastName && (lower === 'lastname' || lower === 'last' || lower === 'surname' || lower === 'familyname')) {
      mapping.lastName = h;
    } else if (!mapping.name && (lower === 'name' || lower === 'fullname' || lower === 'contactname')) {
      mapping.name = h;
    } else if (!mapping.company && (lower.includes('company') || lower.includes('organization') || lower === 'org' || lower === 'business')) {
      mapping.company = h;
    } else if (!mapping.phone && (lower.includes('phone') || lower.includes('mobile') || lower === 'tel')) {
      mapping.phone = h;
    } else if (!mapping.consentStatus && (lower.includes('consent') || lower.includes('optin') || lower === 'status')) {
      mapping.consentStatus = h;
    } else if (!mapping.tags && (lower.includes('tag') || lower.includes('category') || lower === 'group')) {
      mapping.tags = h;
    }
  }

  // Fallback: If no explicit email column found, check first column
  if (!mapping.email && headers.length > 0) {
    mapping.email = headers[0];
  }

  return mapping;
}

/**
 * Previews and validates rows from CSV, XLSX, or raw paste
 */
export async function prepareImportPreview(params: {
  importId: string;
  originalFilename: string;
  fileType: 'csv' | 'xlsx' | 'paste';
  headers: string[];
  rawRows: Array<Record<string, unknown>>;
  sessionId: string | Types.ObjectId;
  customMapping?: Record<string, string>;
  defaultConsentStatus?: ConsentStatus;
  detectedSheets?: string[];
  selectedSheet?: string;
}): Promise<ImportPreviewResult> {
  const {
    importId,
    originalFilename,
    fileType,
    headers,
    rawRows,
    sessionId,
    customMapping,
    defaultConsentStatus = 'unknown',
    detectedSheets,
    selectedSheet,
  } = params;

  const columnMapping = customMapping || detectColumnMapping(headers);
  const emailCol = columnMapping.email;

  const totalRows = rawRows.length;
  const rawEmails: string[] = [];

  // Extract emails for batch validation
  for (const row of rawRows) {
    const emailVal = emailCol && row[emailCol] ? String(row[emailCol]).trim() : '';
    rawEmails.push(emailVal);
  }

  // Batch validation against syntax, suppressions, and existing workspace contacts
  const validationMap = await validateEmailBatch(rawEmails, sessionId);

  const seenEmails = new Set<string>();
  const previewRows: ImportPreviewRow[] = [];
  const errorReport: Array<{ rowNumber: number; error: string; raw: Record<string, unknown> }> = [];

  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let existingRows = 0;
  let suppressedRows = 0;
  let unknownConsentRows = 0;
  let eligibleRows = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 1;
    const rawEmail = emailCol && row[emailCol] ? String(row[emailCol]).trim() : '';

    const validation = validationMap.get(rawEmail);
    const firstName = columnMapping.firstName ? String(row[columnMapping.firstName] || '').trim() : undefined;
    const lastName = columnMapping.lastName ? String(row[columnMapping.lastName] || '').trim() : undefined;
    const name = columnMapping.name
      ? String(row[columnMapping.name] || '').trim()
      : firstName || lastName
      ? `${firstName || ''} ${lastName || ''}`.trim()
      : undefined;
    const company = columnMapping.company ? String(row[columnMapping.company] || '').trim() : undefined;
    const phone = columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : undefined;

    // Consent resolution
    let consentStatus: ConsentStatus = defaultConsentStatus;
    if (columnMapping.consentStatus && row[columnMapping.consentStatus]) {
      const cVal = String(row[columnMapping.consentStatus]).toLowerCase().trim();
      if (['opted_in', 'opted-in', 'optin', 'yes', 'true', '1'].includes(cVal)) {
        consentStatus = 'opted_in';
      } else if (['unsubscribed', 'optout', 'no', 'false', '0'].includes(cVal)) {
        consentStatus = 'unsubscribed';
      } else if (['suppressed', 'bounced'].includes(cVal)) {
        consentStatus = 'suppressed';
      } else {
        consentStatus = 'unknown';
      }
    }

    if (consentStatus === 'unknown') {
      unknownConsentRows++;
    }

    // Determine row validation status
    if (!validation || !validation.syntaxValid) {
      invalidRows++;
      const reason = validation?.error || 'Invalid email syntax';
      errorReport.push({ rowNumber, error: reason, raw: row });

      if (previewRows.length < 50) {
        previewRows.push({
          rowNumber,
          email: rawEmail || '(empty)',
          firstName,
          lastName,
          name,
          company,
          phone,
          consentStatus,
          status: 'invalid',
          errorReason: reason,
        });
      }
      continue;
    }

    // Check duplicate within the same file/import
    if (seenEmails.has(validation.normalizedEmail)) {
      duplicateRows++;
      errorReport.push({ rowNumber, error: 'Duplicate email within file', raw: row });

      if (previewRows.length < 50) {
        previewRows.push({
          rowNumber,
          email: validation.normalizedEmail,
          firstName,
          lastName,
          name,
          company,
          phone,
          consentStatus,
          status: 'duplicate',
          errorReason: 'Duplicate email within import',
        });
      }
      continue;
    }
    seenEmails.add(validation.normalizedEmail);

    // Check suppression
    if (validation.isSuppressed) {
      suppressedRows++;
      errorReport.push({
        rowNumber,
        error: `Suppressed (${validation.suppressionReason})`,
        raw: row,
      });

      if (previewRows.length < 50) {
        previewRows.push({
          rowNumber,
          email: validation.normalizedEmail,
          firstName,
          lastName,
          name,
          company,
          phone,
          consentStatus: 'suppressed',
          status: 'suppressed',
          errorReason: `Address suppressed due to previous ${validation.suppressionReason}`,
        });
      }
      continue;
    }

    // Check existing
    if (validation.isExisting) {
      existingRows++;
      if (previewRows.length < 50) {
        previewRows.push({
          rowNumber,
          email: validation.normalizedEmail,
          firstName,
          lastName,
          name,
          company,
          phone,
          consentStatus,
          status: 'existing',
          errorReason: 'Already present in workspace (will be updated)',
        });
      }
    } else {
      validRows++;
      if (previewRows.length < 50) {
        previewRows.push({
          rowNumber,
          email: validation.normalizedEmail,
          firstName,
          lastName,
          name,
          company,
          phone,
          consentStatus,
          status: 'valid',
        });
      }
    }

    if (consentStatus === 'opted_in') {
      eligibleRows++;
    }
  }

  return {
    importId,
    originalFilename,
    fileType,
    detectedSheets,
    selectedSheet,
    availableColumns: headers,
    columnMapping,
    totalRows,
    validRows,
    invalidRows,
    duplicateRows,
    existingRows,
    suppressedRows,
    unknownConsentRows,
    eligibleRows,
    previewRows,
    errorReport: errorReport.slice(0, 100),
  };
}

export type ConsentStatus = 'opted_in' | 'unknown' | 'unsubscribed' | 'suppressed';

export interface IContact {
  _id: string;
  sessionId: string;
  email: string;
  normalizedEmail: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  phone?: string;
  tags: string[];
  consentStatus: ConsentStatus;
  consentSource: string;
  consentAt?: Date | string;
  consentEvidence?: string;
  consentPolicyVersion?: string;
  importBatchId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ContactStats {
  totalContacts: number;
  eligibleContacts: number;
  pendingConsent: number;
  unsubscribed: number;
  suppressed: number;
  invalidContacts: number;
}

export interface ContactValidationSummary {
  totalSubmitted: number;
  validSyntaxCount: number;
  invalidSyntaxCount: number;
  duplicatesRemovedCount: number;
  suppressedCount: number;
  existingCount: number;
  eligibleCount: number;
  validEmails: string[];
  eligibleEmails: string[];
  invalidEmails: string[];
}

export interface ImportPreviewRow {
  rowNumber: number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  phone?: string;
  consentStatus: ConsentStatus;
  status: 'valid' | 'invalid' | 'duplicate' | 'existing' | 'suppressed';
  errorReason?: string;
}

export interface ImportPreviewResult {
  importId: string;
  originalFilename: string;
  fileType: 'csv' | 'xlsx' | 'paste';
  detectedSheets?: string[];
  selectedSheet?: string;
  availableColumns: string[];
  columnMapping: Record<string, string>;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingRows: number;
  suppressedRows: number;
  unknownConsentRows: number;
  eligibleRows: number;
  previewRows: ImportPreviewRow[];
  errorReport?: Array<{ rowNumber: number; error: string; raw: Record<string, unknown> }>;
}

export interface IContactImport {
  _id: string;
  sessionId: string;
  originalFilename: string;
  fileType: 'csv' | 'xlsx' | 'paste';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingRows: number;
  suppressedRows: number;
  unknownConsentRows: number;
  importedRows: number;
  status: 'pending' | 'previewed' | 'processing' | 'completed' | 'failed' | 'cancelled';
  columnMapping?: Record<string, string>;
  createdAt: Date | string;
  completedAt?: Date | string;
}

export interface ISegmentFilter {
  consentStatus?: ConsentStatus[];
  importSource?: string[];
  tags?: string[];
  company?: string;
  search?: string;
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

export interface ISegment {
  _id?: string;
  id?: string;
  sessionId: string;
  name: string;
  description?: string;
  filters: ISegmentFilter;
  contactCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ITag {
  _id?: string;
  id?: string;
  sessionId: string;
  name: string;
  color: string;
  contactCount?: number;
  createdAt: Date | string;
}

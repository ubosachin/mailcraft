import { Types, FilterQuery } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  connectToDatabase,
  Contact,
  IContactDoc,
  Segment,
  ISegmentDoc,
  Tag,
  Suppression,
} from '@mailcraft/database';
import {
  ConsentStatus,
  ContactStats,
  ISegmentFilter,
} from '@mailcraft/shared-types';
import { sanitizeFormulaInjection } from './import-parser';

export interface ContactQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  consentStatus?: string;
  tag?: string;
  company?: string;
  segmentId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Builds safe MongoDB query filters from safe user options
 */
export async function buildContactFilter(
  sessionId: Types.ObjectId,
  options: ContactQueryOptions
): Promise<FilterQuery<IContactDoc>> {
  const filter: FilterQuery<IContactDoc> = { sessionId };

  // 1. Text Search (email, name, firstName, lastName, company)
  if (options.search && options.search.trim().length > 0) {
    const q = options.search.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { email: regex },
      { name: regex },
      { firstName: regex },
      { lastName: regex },
      { company: regex },
    ];
  }

  // 2. Direct Consent Status
  if (options.consentStatus && ['opted_in', 'unknown', 'unsubscribed', 'suppressed'].includes(options.consentStatus)) {
    filter.consentStatus = options.consentStatus as ConsentStatus;
  }

  // 3. Tag
  if (options.tag && options.tag.trim().length > 0) {
    filter.tags = options.tag.trim();
  }

  // 4. Company
  if (options.company && options.company.trim().length > 0) {
    filter.company = new RegExp(`^${options.company.trim()}$`, 'i');
  }

  // 5. Segment Filters
  if (options.segmentId) {
    const segment = await Segment.findOne({ _id: options.segmentId, sessionId });
    if (segment && segment.filters) {
      applySegmentFilters(filter, segment.filters);
    }
  }

  return filter;
}

/**
 * Applies segment criteria securely to a MongoDB query
 */
export function applySegmentFilters(
  filter: FilterQuery<IContactDoc>,
  segmentFilters: ISegmentFilter
): void {
  if (segmentFilters.consentStatus && segmentFilters.consentStatus.length > 0) {
    filter.consentStatus = { $in: segmentFilters.consentStatus };
  }

  if (segmentFilters.tags && segmentFilters.tags.length > 0) {
    filter.tags = { $in: segmentFilters.tags };
  }

  if (segmentFilters.company) {
    filter.company = new RegExp(segmentFilters.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  if (segmentFilters.importSource && segmentFilters.importSource.length > 0) {
    filter.consentSource = { $in: segmentFilters.importSource };
  }

  if (segmentFilters.createdAfter || segmentFilters.createdBefore) {
    filter.createdAt = {};
    if (segmentFilters.createdAfter) {
      filter.createdAt.$gte = new Date(segmentFilters.createdAfter);
    }
    if (segmentFilters.createdBefore) {
      filter.createdAt.$lte = new Date(segmentFilters.createdBefore);
    }
  }
}

/**
 * Calculates live MongoDB aggregated contact metrics
 */
export async function calculateContactStats(sessionId: Types.ObjectId): Promise<ContactStats> {
  await connectToDatabase();

  const [totalContacts, eligibleContacts, pendingConsent, unsubscribed, suppressed] =
    await Promise.all([
      Contact.countDocuments({ sessionId }),
      Contact.countDocuments({ sessionId, consentStatus: 'opted_in' }),
      Contact.countDocuments({ sessionId, consentStatus: 'unknown' }),
      Contact.countDocuments({ sessionId, consentStatus: 'unsubscribed' }),
      Contact.countDocuments({ sessionId, consentStatus: 'suppressed' }),
    ]);

  return {
    totalContacts,
    eligibleContacts,
    pendingConsent,
    unsubscribed,
    suppressed,
    invalidContacts: 0,
  };
}

/**
 * Generates exported CSV or XLSX buffer
 */
export async function exportContactsBuffer(
  sessionId: Types.ObjectId,
  format: 'csv' | 'xlsx',
  options: ContactQueryOptions = {}
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  await connectToDatabase();
  const filter = await buildContactFilter(sessionId, options);

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const exportRows = contacts.map((c) => ({
    'Email Address': sanitizeFormulaInjection(c.email),
    'First Name': sanitizeFormulaInjection(c.firstName || ''),
    'Last Name': sanitizeFormulaInjection(c.lastName || ''),
    'Full Name': sanitizeFormulaInjection(c.name || ''),
    'Company': sanitizeFormulaInjection(c.company || ''),
    'Phone': sanitizeFormulaInjection(c.phone || ''),
    'Consent Status': c.consentStatus,
    'Consent Source': sanitizeFormulaInjection(c.consentSource || ''),
    'Consent Date': c.consentAt ? new Date(c.consentAt).toISOString() : '',
    'Tags': (c.tags || []).join('; '),
    'Date Added': new Date(c.createdAt).toISOString(),
  }));

  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `mailcraft_contacts_${timestamp}.csv`,
      mimeType: 'text/csv; charset=utf-8',
    };
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: xlsxBuffer,
    filename: `mailcraft_contacts_${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

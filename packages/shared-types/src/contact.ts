export type ConsentStatus = 'opted_in' | 'unknown' | 'unsubscribed';

export interface IContact {
  _id: string;
  sessionId: string;
  email: string;
  name?: string;
  consentStatus: ConsentStatus;
  consentSource: string;
  consentAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactValidationSummary {
  totalSubmitted: number;
  validSyntaxCount: number;
  invalidSyntaxCount: number;
  duplicatesRemovedCount: number;
  suppressedCount: number;
  eligibleCount: number;
  invalidEmails: string[];
}


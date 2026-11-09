import { SenderVerificationDetails } from '@mailcraft/shared-types';

export interface SendEmailPayload {
  to: string;
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  messageId: string;
  accepted: boolean;
  provider: 'gmail' | 'brevo' | 'ses' | 'mock';
  rawResponse?: unknown;
}

export interface ConnectionVerificationResult {
  valid: boolean;
  provider: 'gmail' | 'brevo' | 'ses' | 'mock';
  senderEmail?: string;
  accountStatus?: string;
  dailyQuotaRemaining?: number;
  error?: string;
}

export type SenderVerificationResult = SenderVerificationDetails;

export interface IEmailProvider {
  readonly providerType: 'gmail' | 'brevo' | 'ses' | 'mock';
  connect(): Promise<void>;
  verifyConnection(): Promise<ConnectionVerificationResult>;
  verifySender(senderEmail?: string): Promise<SenderVerificationResult>;
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
  disconnect(): Promise<void>;
}

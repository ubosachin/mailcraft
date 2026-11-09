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
  provider: string;
  rawResponse?: unknown;
}

export interface IEmailProvider {
  readonly providerType: 'gmail' | 'brevo' | 'ses' | 'mock';
  connect(): Promise<void>;
  verifySender(): Promise<boolean>;
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
  disconnect(): Promise<void>;
}


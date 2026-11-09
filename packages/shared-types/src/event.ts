export type EmailEventType =
  | 'provider_accepted'
  | 'delivered'
  | 'deferred'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'complaint'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'rejected'
  | 'failed';

export type CampaignEventType =
  | EmailEventType
  | 'sent'
  | 'bounced'
  | 'complained';

export interface IEmailEvent {
  _id: string;
  sessionId: string;
  campaignId: string;
  campaignRecipientId?: string;
  contactId?: string;
  provider: string;
  providerMessageId?: string;
  eventType: EmailEventType;
  eventTimestamp: Date | string;
  receivedAt: Date | string;
  eventId: string;
  metadata?: Record<string, unknown>;
  processingStatus: 'processed' | 'ignored' | 'failed';
}

export interface ICampaignEvent {
  _id: string;
  campaignId: string;
  recipientId?: string;
  eventType: CampaignEventType;
  metadata?: Record<string, unknown>;
  occurredAt: Date | string;
}

export interface ITrackingToken {
  _id: string;
  tokenHash: string;
  token?: string;
  type: 'open' | 'click' | 'unsubscribe';
  campaignId: string;
  campaignRecipientId?: string;
  contactId?: string;
  sessionId: string;
  destinationUrl?: string;
  clickCount: number;
  openCount: number;
  firstClickedAt?: Date | string;
  lastClickedAt?: Date | string;
  firstOpenedAt?: Date | string;
  isBot?: boolean;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface IUnsubscribeEvent {
  _id: string;
  contactId?: string;
  campaignId?: string;
  sessionId: string;
  emailHash: string;
  source: 'one_click_header' | 'landing_page' | 'preference_center' | 'complaint_feedback';
  unsubscribedAt: Date | string;
  tokenHash?: string;
  metadata?: Record<string, unknown>;
}

export interface IWebhookEventLog {
  _id: string;
  provider: 'brevo' | 'ses' | 'mock' | 'generic';
  eventId?: string;
  signatureValid: boolean;
  rawHeaders?: Record<string, string>;
  rawPayload: Record<string, unknown>;
  processingStatus: 'processed' | 'ignored' | 'failed';
  errorMessage?: string;
  receivedAt: Date | string;
}

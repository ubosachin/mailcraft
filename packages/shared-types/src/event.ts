export type CampaignEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed';

export interface ICampaignEvent {
  _id: string;
  campaignId: string;
  recipientId?: string;
  eventType: CampaignEventType;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

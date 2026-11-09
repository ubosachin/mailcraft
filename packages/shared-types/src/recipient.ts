export type DeliveryStatus =
  | 'pending'
  | 'queued'
  | 'accepted'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'unsubscribed';

export interface ICampaignRecipient {
  _id: string;
  campaignId: string;
  contactId?: string;
  email: string;
  status: DeliveryStatus;
  providerMessageId?: string;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}


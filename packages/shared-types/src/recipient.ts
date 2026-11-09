export type DeliveryStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'accepted'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'unsubscribed';

export type {
  ICampaignRecipient,
  RecipientDeliveryStatus,
} from './campaign.js';

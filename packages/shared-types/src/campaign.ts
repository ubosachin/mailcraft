export type CampaignStatus =
  | 'draft'
  | 'validating'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelling'
  | 'cancelled';

export type RecipientDeliveryStatus =
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

export interface ICampaignStats {
  accepted: number;
  delivered: number;
  bounced: number;
  clicked: number;
  unsubscribed: number;
  failed: number;
}

export interface ICampaignSnapshot {
  subject: string;
  preheader?: string;
  senderName: string;
  senderEmail: string;
  provider: string;
  renderedHtml: string;
  renderedText?: string;
  templateVersion?: number;
  editorData?: Record<string, unknown>;
  snapshotAt: Date | string;
}

export interface ICampaign {
  _id?: string;
  id?: string;
  sessionId: string;
  brandId: string;
  connectionId?: string;
  campaignName: string;
  description?: string;
  subject: string;
  preheader?: string;
  senderName?: string;
  senderEmail?: string;
  provider?: string;
  templateId?: string;
  editorData: Record<string, unknown>;
  renderedHtml?: string;
  renderedText?: string;
  audienceType?: 'all_eligible' | 'segment' | 'tag' | 'custom_selection';
  audienceFilters?: Record<string, unknown>;
  recipientCount: number;
  eligibleRecipientCount?: number;
  status: CampaignStatus;
  stats: ICampaignStats;
  scheduledAt?: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  pausedAt?: Date | string;
  cancelledAt?: Date | string;
  snapshot?: ICampaignSnapshot;
  idempotencyKey?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICampaignValidationIssue {
  code: string;
  message: string;
}

export interface ICampaignValidationResult {
  valid: boolean;
  errors: ICampaignValidationIssue[];
  warnings: ICampaignValidationIssue[];
}

export interface ICampaignRecipient {
  _id?: string;
  id?: string;
  campaignId: string;
  sessionId: string;
  contactId?: string;
  email: string;
  personalizationData?: Record<string, unknown>;
  status: RecipientDeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  queuedAt?: Date | string;
  sentAt?: Date | string;
  acceptedAt?: Date | string;
  deliveredAt?: Date | string;
  bouncedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface ICampaignProgress {
  campaignId: string;
  status: CampaignStatus;
  total: number;
  queued: number;
  processing: number;
  delivered: number;
  bounced: number;
  failed: number;
  cancelled: number;
  percentage: number;
  startedAt?: string;
  completedAt?: string;
}

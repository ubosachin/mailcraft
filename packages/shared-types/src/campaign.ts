export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'completed'
  | 'paused'
  | 'failed'
  | 'cancelled';

export interface ICampaignStats {
  accepted: number;
  delivered: number;
  bounced: number;
  clicked: number;
  unsubscribed: number;
  failed: number;
}

export interface ICampaign {
  _id: string;
  sessionId: string;
  brandId: string;
  connectionId?: string;
  campaignName: string;
  subject: string;
  preheader?: string;
  templateId?: string;
  editorData: Record<string, unknown>;
  renderedHtml?: string;
  recipientCount: number;
  status: CampaignStatus;
  stats: ICampaignStats;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}


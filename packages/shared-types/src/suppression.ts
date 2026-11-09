export type SuppressionReason =
  | 'unsubscribe'
  | 'bounce'
  | 'hard_bounce'
  | 'soft_bounce_threshold'
  | 'complaint'
  | 'manual'
  | 'administrative';

export type SuppressionScope = 'global' | 'session';

export interface ISuppressionMetadata {
  campaignId?: string;
  reasonDetail?: string;
  source?: string;
  notes?: string;
  createdBy?: string;
}

export interface ISuppression {
  _id: string;
  emailHash: string;
  emailEncrypted: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  sessionId?: string;
  metadata?: ISuppressionMetadata;
  createdAt: Date | string;
}

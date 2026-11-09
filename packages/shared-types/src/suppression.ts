export type SuppressionReason = 'unsubscribe' | 'bounce' | 'complaint' | 'manual';
export type SuppressionScope = 'global' | 'session';

export interface ISuppression {
  _id: string;
  emailHash: string;
  emailEncrypted: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  sessionId?: string;
  createdAt: Date;
}

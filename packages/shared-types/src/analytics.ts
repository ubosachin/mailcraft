export interface IAnalyticsOverview {
  totalCampaigns: number;
  totalAttempted: number;
  providerAccepted: number;
  confirmedDeliveries: number;
  hardBounces: number;
  softBounces: number;
  totalBounces: number;
  complaints: number;
  totalClicks: number;
  uniqueClickers: number;
  uniqueOpens: number;
  totalOpens: number;
  unsubscribes: number;
  failedSends: number;
  acceptanceRate: number | null; // (accepted / attempted) * 100
  deliveryRate: number | null; // (confirmed / attempted) * 100
  bounceRate: number | null; // (bounces / attempted) * 100
  complaintRate: number | null; // (complaints / confirmed) * 100
  clickThroughRate: number | null; // (uniqueClickers / confirmed) * 100
  unsubscribeRate: number | null; // (unsubscribes / confirmed) * 100
}

export interface IAnalyticsLinkPerformance {
  url: string;
  clickCount: number;
  uniqueClickers: number;
}

export interface IAnalyticsTimelinePoint {
  timestamp: string;
  deliveries: number;
  bounces: number;
  clicks: number;
  opens: number;
}

export interface ICampaignAnalyticsDetail extends IAnalyticsOverview {
  campaignId: string;
  campaignName: string;
  subject: string;
  provider: string;
  senderName: string;
  senderEmail: string;
  sentDate?: string;
  status: string;
  targetRecipients: number;
  links: IAnalyticsLinkPerformance[];
  timeline: IAnalyticsTimelinePoint[];
}

export interface IComplianceCheckResult {
  valid: boolean;
  status: 'passed' | 'warning' | 'blocked';
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'advisory';
  description: string;
  field?: string;
  suggestedAction: string;
}

export interface IComplianceReport {
  overallStatus: 'passed' | 'warning' | 'blocked';
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  checks: IComplianceCheckResult[];
  disclaimer: string;
}

export interface IDnsCheckResult {
  domain: string;
  spf: {
    configured: boolean;
    record?: string;
    status: 'verified' | 'action_required' | 'not_configured';
    guidance: string;
  };
  dkim: {
    configured: boolean;
    status: 'verified' | 'pending' | 'action_required' | 'not_configured';
    guidance: string;
  };
  dmarc: {
    configured: boolean;
    record?: string;
    policy?: 'none' | 'quarantine' | 'reject';
    status: 'verified' | 'action_required' | 'not_configured';
    guidance: string;
  };
}

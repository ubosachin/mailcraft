import { GuestSession } from './models/GuestSession.js';
import { Brand } from './models/Brand.js';
import { Contact } from './models/Contact.js';
import { ContactImport } from './models/ContactImport.js';
import { Campaign } from './models/Campaign.js';
import { CampaignRecipient } from './models/CampaignRecipient.js';
import { CampaignEvent } from './models/CampaignEvent.js';
import { EmailConnection } from './models/EmailConnection.js';
import { TrackingToken } from './models/TrackingToken.js';
import { Suppression } from './models/Suppression.js';
import { WebhookEventLog } from './models/WebhookEventLog.js';

export interface CleanupResult {
  expiredSessionsCount: number;
  deletedBrands: number;
  deletedContacts: number;
  deletedImports: number;
  deletedCampaigns: number;
  deletedRecipients: number;
  deletedEvents: number;
  deletedConnections: number;
  deletedTrackingTokens: number;
  deletedWebhookLogs: number;
  globalSuppressionsPreserved: number;
  dryRun: boolean;
  executedAt: string;
}

/**
 * Performs cascading data retention cleanup on expired or revoked guest sessions.
 * CRITICAL LEGAL GUARANTEE: Global suppression records are NEVER deleted during cleanup.
 */
export async function cleanupExpiredGuestData(options?: {
  cutoffDate?: Date;
  webhookRetentionDays?: number;
  dryRun?: boolean;
}): Promise<CleanupResult> {
  const cutoff = options?.cutoffDate || new Date();
  const webhookCutoff = new Date(
    Date.now() - (options?.webhookRetentionDays || 30) * 24 * 60 * 60 * 1000
  );
  const dryRun = options?.dryRun || false;

  // 1. Locate expired or revoked guest sessions (excluding authenticated registered users)
  const expiredSessions = await GuestSession.find({
    $or: [{ userId: null }, { userId: { $exists: false } }],
    $and: [
      {
        $or: [{ status: { $in: ['expired', 'revoked'] } }, { expiresAt: { $lt: cutoff } }],
      },
    ],
  }).select('_id');

  const sessionIds = expiredSessions.map((s) => s._id);

  // Count global suppressions to verify preservation
  const globalSuppressionsPreserved = await Suppression.countDocuments({ scope: 'global' });

  if (sessionIds.length === 0) {
    // Also clean old webhook logs
    let deletedWebhookLogs = 0;
    if (!dryRun) {
      const webhookRes = await WebhookEventLog.deleteMany({
        receivedAt: { $lt: webhookCutoff },
      });
      deletedWebhookLogs = webhookRes.deletedCount || 0;
    }

    return {
      expiredSessionsCount: 0,
      deletedBrands: 0,
      deletedContacts: 0,
      deletedImports: 0,
      deletedCampaigns: 0,
      deletedRecipients: 0,
      deletedEvents: 0,
      deletedConnections: 0,
      deletedTrackingTokens: 0,
      deletedWebhookLogs,
      globalSuppressionsPreserved,
      dryRun,
      executedAt: new Date().toISOString(),
    };
  }

  // Count or delete associated data
  if (dryRun) {
    const [
      brands,
      contacts,
      imports,
      campaigns,
      recipients,
      events,
      conns,
      tokens,
      webhooks,
    ] = await Promise.all([
      Brand.countDocuments({ sessionId: { $in: sessionIds } }),
      Contact.countDocuments({ sessionId: { $in: sessionIds } }),
      ContactImport.countDocuments({ sessionId: { $in: sessionIds } }),
      Campaign.countDocuments({ sessionId: { $in: sessionIds } }),
      CampaignRecipient.countDocuments({ sessionId: { $in: sessionIds } }),
      CampaignEvent.countDocuments({ sessionId: { $in: sessionIds } }),
      EmailConnection.countDocuments({ sessionId: { $in: sessionIds } }),
      TrackingToken.countDocuments({ sessionId: { $in: sessionIds } }),
      WebhookEventLog.countDocuments({ receivedAt: { $lt: webhookCutoff } }),
    ]);

    return {
      expiredSessionsCount: sessionIds.length,
      deletedBrands: brands,
      deletedContacts: contacts,
      deletedImports: imports,
      deletedCampaigns: campaigns,
      deletedRecipients: recipients,
      deletedEvents: events,
      deletedConnections: conns,
      deletedTrackingTokens: tokens,
      deletedWebhookLogs: webhooks,
      globalSuppressionsPreserved,
      dryRun: true,
      executedAt: new Date().toISOString(),
    };
  }

  // Execute cascading deletion
  const [
    brandRes,
    contactRes,
    importRes,
    campaignRes,
    recipientRes,
    eventRes,
    connRes,
    tokenRes,
    webhookRes,
    sessionRes,
  ] = await Promise.all([
    Brand.deleteMany({ sessionId: { $in: sessionIds } }),
    Contact.deleteMany({ sessionId: { $in: sessionIds } }),
    ContactImport.deleteMany({ sessionId: { $in: sessionIds } }),
    Campaign.deleteMany({ sessionId: { $in: sessionIds } }),
    CampaignRecipient.deleteMany({ sessionId: { $in: sessionIds } }),
    CampaignEvent.deleteMany({ sessionId: { $in: sessionIds } }),
    EmailConnection.deleteMany({ sessionId: { $in: sessionIds } }),
    TrackingToken.deleteMany({ sessionId: { $in: sessionIds } }),
    WebhookEventLog.deleteMany({ receivedAt: { $lt: webhookCutoff } }),
    GuestSession.deleteMany({ _id: { $in: sessionIds } }),
  ]);

  // Notice: Suppression collection with scope 'global' is untouched!
  return {
    expiredSessionsCount: sessionRes.deletedCount || sessionIds.length,
    deletedBrands: brandRes.deletedCount || 0,
    deletedContacts: contactRes.deletedCount || 0,
    deletedImports: importRes.deletedCount || 0,
    deletedCampaigns: campaignRes.deletedCount || 0,
    deletedRecipients: recipientRes.deletedCount || 0,
    deletedEvents: eventRes.deletedCount || 0,
    deletedConnections: connRes.deletedCount || 0,
    deletedTrackingTokens: tokenRes.deletedCount || 0,
    deletedWebhookLogs: webhookRes.deletedCount || 0,
    globalSuppressionsPreserved,
    dryRun: false,
    executedAt: new Date().toISOString(),
  };
}


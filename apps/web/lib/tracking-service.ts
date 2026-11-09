import crypto from 'node:crypto';
import {
  connectToDatabase,
  TrackingToken,
  EmailEvent,
  Campaign,
  CampaignRecipient,
} from '@mailcraft/database';

export function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function isDangerousUrlScheme(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  // Strip control characters and whitespace
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  return (
    sanitized.startsWith('javascript:') ||
    sanitized.startsWith('data:') ||
    sanitized.startsWith('file:') ||
    sanitized.startsWith('vbscript:')
  );
}

export function isValidHttpUrl(url: string): boolean {
  if (isDangerousUrlScheme(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectAutomatedBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const botKeywords = [
    'googleimageproxy',
    'apple mail privacy protection',
    'yahoo! slurp',
    'bingbot',
    'googlebot',
    'baiduspider',
    'barracuda',
    'proofpoint',
    'mimecast',
    'trend micro',
    'symantec',
    'virusdie',
    'mailscanner',
    'curl',
    'wget',
    'python-requests',
    'go-http-client',
    'headlesschrome',
    'phantomjs',
  ];

  return botKeywords.some((bot) => ua.includes(bot));
}

export interface CreateTrackingTokenParams {
  type: 'open' | 'click' | 'unsubscribe';
  campaignId: string;
  campaignRecipientId?: string;
  contactId?: string;
  sessionId: string;
  destinationUrl?: string;
  expiresInDays?: number;
}

export async function createTrackingToken(
  params: CreateTrackingTokenParams
): Promise<{ token: string; tokenHash: string }> {
  await connectToDatabase();

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashTrackingToken(token);
  const expiresInDays = params.expiresInDays || 90;
  const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000);

  await TrackingToken.create({
    tokenHash,
    token: null, // Zero raw token persistence in DB
    type: params.type,
    campaignId: params.campaignId,
    campaignRecipientId: params.campaignRecipientId || null,
    contactId: params.contactId || null,
    sessionId: params.sessionId,
    destinationUrl: params.destinationUrl || null,
    expiresAt,
  });

  return { token, tokenHash };
}

export interface TransformLinksOptions {
  appUrl: string;
  campaignId: string;
  campaignRecipientId: string;
  sessionId: string;
  trackOpens?: boolean;
}

export async function transformEmailHtmlWithTracking(
  html: string,
  options: TransformLinksOptions
): Promise<string> {
  let transformed = html;

  // Regex to extract href attributes
  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const matches = [...transformed.matchAll(hrefRegex)];

  for (const match of matches) {
    const originalUrl = match[1];

    // Do not transform unsubscribe links or internal anchor links
    if (
      originalUrl.includes('/unsubscribe') ||
      originalUrl.includes('mailto:') ||
      originalUrl.includes('tel:') ||
      originalUrl.startsWith('#')
    ) {
      continue;
    }

    if (!isValidHttpUrl(originalUrl)) {
      continue;
    }

    try {
      const { token } = await createTrackingToken({
        type: 'click',
        campaignId: options.campaignId,
        campaignRecipientId: options.campaignRecipientId,
        sessionId: options.sessionId,
        destinationUrl: originalUrl,
      });

      const trackingUrl = `${options.appUrl}/track/click/${token}`;
      // Replace only this exact occurrence
      transformed = transformed.replace(
        match[0],
        match[0].replace(originalUrl, trackingUrl)
      );
    } catch (err) {
      console.error('[TrackingService] Failed to generate click token for link:', originalUrl, err);
    }
  }

  // Open Tracking Pixel
  if (options.trackOpens !== false) {
    try {
      const { token: openToken } = await createTrackingToken({
        type: 'open',
        campaignId: options.campaignId,
        campaignRecipientId: options.campaignRecipientId,
        sessionId: options.sessionId,
      });

      const pixelUrl = `${options.appUrl}/track/open/${openToken}`;
      const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none!important;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;" />`;

      if (transformed.includes('</body>')) {
        transformed = transformed.replace('</body>', `${pixelTag}</body>`);
      } else {
        transformed = transformed + pixelTag;
      }
    } catch (err) {
      console.error('[TrackingService] Failed to inject open pixel:', err);
    }
  }

  return transformed;
}

export async function recordOpenEvent(
  token: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<{ success: boolean; isFirstOpen?: boolean; isBot?: boolean }> {
  await connectToDatabase();

  const tokenHash = hashTrackingToken(token);
  const tokenDoc = await TrackingToken.findOne({
    tokenHash,
    type: 'open',
  });

  if (!tokenDoc) {
    return { success: false };
  }

  if (tokenDoc.expiresAt && tokenDoc.expiresAt < new Date()) {
    return { success: false };
  }

  const isBot = detectAutomatedBot(meta?.userAgent);
  const isFirstOpen = tokenDoc.openCount === 0;

  tokenDoc.openCount += 1;
  if (!tokenDoc.firstOpenedAt) {
    tokenDoc.firstOpenedAt = new Date();
  }
  if (isBot) {
    tokenDoc.isBot = true;
  }
  await tokenDoc.save();

  // Create EmailEvent record
  const eventId = `open_${tokenDoc._id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    await EmailEvent.create({
      sessionId: tokenDoc.sessionId,
      campaignId: tokenDoc.campaignId,
      campaignRecipientId: tokenDoc.campaignRecipientId,
      contactId: tokenDoc.contactId,
      provider: 'tracking_pixel',
      eventType: 'opened',
      eventTimestamp: new Date(),
      eventId,
      metadata: {
        isBot,
        isFirstOpen,
        userAgent: meta?.userAgent?.slice(0, 300),
        ip: meta?.ip ? hashTrackingToken(meta.ip).slice(0, 16) : undefined, // Pseudonymized IP
      },
      processingStatus: 'processed',
    });

    if (isFirstOpen) {
      await Campaign.updateOne(
        { _id: tokenDoc.campaignId },
        { $inc: { 'stats.opened': 1 } }
      );
    }
  } catch (err) {
    console.error('[TrackingService] Error saving open EmailEvent:', err);
  }

  return { success: true, isFirstOpen, isBot };
}

export async function recordClickEvent(
  token: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<{
  success: boolean;
  destinationUrl?: string;
  isFirstClick?: boolean;
  isBot?: boolean;
}> {
  await connectToDatabase();

  const tokenHash = hashTrackingToken(token);
  const tokenDoc = await TrackingToken.findOne({
    tokenHash,
    type: 'click',
  });

  if (!tokenDoc || !tokenDoc.destinationUrl) {
    return { success: false };
  }

  if (tokenDoc.expiresAt && tokenDoc.expiresAt < new Date()) {
    return { success: false };
  }

  const destination = tokenDoc.destinationUrl;
  if (!isValidHttpUrl(destination)) {
    return { success: false };
  }

  const isBot = detectAutomatedBot(meta?.userAgent);
  const isFirstClick = tokenDoc.clickCount === 0;

  tokenDoc.clickCount += 1;
  if (!tokenDoc.firstClickedAt) {
    tokenDoc.firstClickedAt = new Date();
  }
  tokenDoc.lastClickedAt = new Date();
  if (isBot) {
    tokenDoc.isBot = true;
  }
  await tokenDoc.save();

  // Create EmailEvent record
  const eventId = `click_${tokenDoc._id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    await EmailEvent.create({
      sessionId: tokenDoc.sessionId,
      campaignId: tokenDoc.campaignId,
      campaignRecipientId: tokenDoc.campaignRecipientId,
      contactId: tokenDoc.contactId,
      provider: 'tracking_redirect',
      eventType: 'clicked',
      eventTimestamp: new Date(),
      eventId,
      metadata: {
        destinationUrl: destination,
        isBot,
        isFirstClick,
        userAgent: meta?.userAgent?.slice(0, 300),
      },
      processingStatus: 'processed',
    });

    if (isFirstClick) {
      await Campaign.updateOne(
        { _id: tokenDoc.campaignId },
        { $inc: { 'stats.clicked': 1 } }
      );
      if (tokenDoc.campaignRecipientId) {
        await CampaignRecipient.updateOne(
          { _id: tokenDoc.campaignRecipientId },
          { $inc: { clickCount: 1 } }
        );
      }
    }
  } catch (err) {
    console.error('[TrackingService] Error saving click EmailEvent:', err);
  }

  return {
    success: true,
    destinationUrl: destination,
    isFirstClick,
    isBot,
  };
}
